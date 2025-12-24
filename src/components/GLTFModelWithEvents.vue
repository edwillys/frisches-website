<script setup lang="ts">
/**
 * GLTFModelWithEvents - Optimized GLTF Model Loader with Animation Support
 *
 * Features:
 * - Proper animation detection and playback via useAnimations
 * - Mesh optimization (frustum culling, bounding computation)
 * - Shadow configuration
 * - Error handling with proper events
 */
import { computed, watchEffect, shallowRef, onUnmounted, watch } from 'vue'
import { useGLTF, useAnimations } from '@tresjs/cientos'
import type { AnimationClip, Object3D, BufferGeometry, Material } from 'three'

// Type guards
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'

interface MeshLike {
  isMesh?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
  frustumCulled?: boolean
  geometry?: BufferGeometry
  material?: Material | Material[]
}

const isMeshLike = (value: unknown): value is MeshLike =>
  isObject(value) && (value as MeshLike).isMesh === true

const props = withDefaults(
  defineProps<{
    path: string
    draco?: boolean
    decoderPath?: string
    castShadow?: boolean
    receiveShadow?: boolean
    autoPlayAnimation?: boolean
    animationIndex?: number
  }>(),
  {
    draco: true, // Enable Draco by default for better performance
    decoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
    castShadow: false,
    receiveShadow: false,
    autoPlayAnimation: true,
    animationIndex: 0,
  }
)

const emit = defineEmits<{
  loaded: [payload: { scene: Object3D; animations: AnimationClip[] }]
  error: [error: unknown]
  animationStarted: [animationName: string]
}>()

// Load GLTF with useGLTF composable
const { state, isLoading } = useGLTF(props.path, {
  draco: props.draco,
  decoderPath: props.decoderPath,
})

// Reset loaded flag when path changes (new model)
watch(
  () => props.path,
  () => {
    hasEmittedLoaded.value = false
  }
)

// Extract scene and animations from state
const sceneObject = computed<Object3D | null>(() => {
  if (!state.value) return null
  // GLTF type has scene as Group which extends Object3D
  return (state.value as unknown as { scene?: Object3D }).scene || null
})

const animations = computed<AnimationClip[]>(() => {
  if (!state.value) return []
  return (state.value as unknown as { animations?: AnimationClip[] }).animations || []
})

// Use animations composable for proper animation playback
const { actions, mixer } = useAnimations(animations, sceneObject)

// Track current action for cleanup
const currentActionName = shallowRef<string | null>(null)

// Track if loaded event has been emitted for current model
const hasEmittedLoaded = shallowRef(false)

// Play animation when available, stop when autoPlayAnimation becomes false
watch(
  [actions, () => props.autoPlayAnimation, () => props.animationIndex],
  ([newActions, autoPlay, animIndex]) => {
    if (!newActions) return

    const actionNames = Object.keys(newActions)
    if (actionNames.length === 0) return

    // If autoPlay is false, stop animation with fade out
    if (!autoPlay) {
      if (currentActionName.value) {
        const currentAction = newActions[currentActionName.value]
        if (currentAction) {
          currentAction.fadeOut(0.5)
          currentActionName.value = null
        }
      }
      return
    }

    // Stop current animation if any (before starting new one)
    if (currentActionName.value) {
      const currentAction = newActions[currentActionName.value]
      if (currentAction) {
        currentAction.stop()
      }
    }

    // Play animation at specified index (or first available)
    const targetIndex = Math.min(animIndex, actionNames.length - 1)
    const animName = actionNames[targetIndex]
    if (animName) {
      const action = newActions[animName]
      if (action) {
        action.reset().fadeIn(0.3).play()
        currentActionName.value = animName
        emit('animationStarted', animName)
      }
    }
  },
  { immediate: true }
)

// Cleanup on unmount
onUnmounted(() => {
  if (mixer.value) {
    mixer.value.stopAllAction()
  }
})

// Emit loaded event when model is ready (only once per model)
watch(
  [isLoading, sceneObject],
  ([loading, scene]) => {
    if (loading || !scene || hasEmittedLoaded.value) return

    hasEmittedLoaded.value = true
    emit('loaded', {
      scene,
      animations: animations.value,
    })
  },
  { immediate: true }
)

// Apply shadow settings and optimize meshes
watchEffect(() => {
  const scene = sceneObject.value
  if (!scene) return

  const traverseObj = scene as { traverse?: (fn: (child: unknown) => void) => void }
  if (!traverseObj.traverse) return

  traverseObj.traverse((child: unknown) => {
    if (!isMeshLike(child)) return

    // Shadow configuration
    child.castShadow = props.castShadow
    child.receiveShadow = props.receiveShadow

    // Mesh optimizations
    child.frustumCulled = true

    // Optimize geometry if available
    if (child.geometry) {
      // Compute bounding box/sphere for frustum culling
      if (!child.geometry.boundingBox) {
        child.geometry.computeBoundingBox()
      }
      if (!child.geometry.boundingSphere) {
        child.geometry.computeBoundingSphere()
      }
    }
  })
})

// Expose for parent component access
defineExpose({
  scene: sceneObject,
  animations,
  actions,
  mixer,
})
</script>

<template>
  <primitive v-if="sceneObject" :object="sceneObject" v-bind="$attrs" />
</template>
