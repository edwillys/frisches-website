<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useGLTF } from '@tresjs/cientos'

type MeshLike = {
  isMesh?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object'

const isMeshLike = (value: unknown): value is MeshLike =>
  isObject(value) && (value as MeshLike).isMesh === true

type RefLike<T> = { value: T }
const isRefLike = <T = unknown,>(value: unknown): value is RefLike<T> =>
  isObject(value) && 'value' in value

const props = withDefaults(
  defineProps<{
    path: string
    draco?: boolean
    decoderPath?: string
    castShadow?: boolean
    receiveShadow?: boolean
  }>(),
  {
    draco: false,
    decoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
    castShadow: false,
    receiveShadow: false,
  }
)

const emit = defineEmits<{
  loaded: [payload: unknown]
  error: [error: unknown]
}>()

const gltfResult = useGLTF(props.path, {
  draco: props.draco,
  decoderPath: props.decoderPath,
}) as unknown

// `useGLTF` shape differs across versions; support both:
// - `{ scene, isLoading, error }` where `scene` is a ref
// - `{ state, isLoading, error }` where `state.value.scene` exists
const resultObj = (isObject(gltfResult) ? gltfResult : {}) as Record<string, unknown>

const sceneRef = isRefLike(resultObj.scene) ? (resultObj.scene as RefLike<unknown>) : null
const stateRef = isRefLike(resultObj.state)
  ? (resultObj.state as RefLike<{ scene?: unknown } | null>)
  : ({ value: null } as RefLike<{ scene?: unknown } | null>)
const isLoadingRef = isRefLike(resultObj.isLoading)
  ? (resultObj.isLoading as RefLike<boolean>)
  : ({ value: false } as RefLike<boolean>)
const errorRef = isRefLike(resultObj.error)
  ? (resultObj.error as RefLike<unknown>)
  : ({ value: null } as RefLike<unknown>)

defineExpose({ instance: stateRef })

const sceneObject = computed<unknown>(() => sceneRef?.value ?? stateRef.value?.scene)

watchEffect(() => {
  if (errorRef.value) emit('error', errorRef.value)
})

watchEffect(() => {
  if (isLoadingRef.value) return
  const scene = sceneObject.value
  if (!scene) return

  // Extract animations if available
  const animations = isRefLike(resultObj.animations)
    ? (resultObj.animations as RefLike<unknown>).value
    : resultObj.animations

  const payload = { scene, animations }
  emit('loaded', payload)
})

watchEffect(() => {
  const sceneValue = sceneObject.value
  if (!sceneValue) return
  if (!props.castShadow && !props.receiveShadow) return

  const scene = sceneValue as { traverse?: (fn: (child: unknown) => void) => void } | undefined
  if (!scene?.traverse) return

  scene.traverse((child: unknown) => {
    if (!isMeshLike(child)) return
    child.castShadow = props.castShadow
    child.receiveShadow = props.receiveShadow
  })
})
</script>

<template>
  <primitive v-if="sceneObject" :object="sceneObject" v-bind="$attrs" />
</template>
