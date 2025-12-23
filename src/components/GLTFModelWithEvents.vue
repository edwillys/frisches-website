<script setup lang="ts">
import { watchEffect } from 'vue'
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
}) as unknown as {
  state?: unknown
  isLoading?: unknown
  error?: unknown
}

const stateRef: RefLike<{ scene?: unknown } | null> = isRefLike(gltfResult.state)
  ? (gltfResult.state as RefLike<{ scene?: unknown } | null>)
  : { value: null }
const isLoadingRef: RefLike<boolean> = isRefLike(gltfResult.isLoading)
  ? (gltfResult.isLoading as RefLike<boolean>)
  : { value: false }
const errorRef: RefLike<unknown> = isRefLike(gltfResult.error)
  ? (gltfResult.error as RefLike<unknown>)
  : { value: null }

defineExpose({ instance: stateRef })

watchEffect(() => {
  if (errorRef.value) emit('error', errorRef.value)
})

watchEffect(() => {
  if (!isLoadingRef.value && stateRef.value?.scene) emit('loaded', stateRef.value)
})

watchEffect(() => {
  if (!stateRef.value?.scene) return
  if (!props.castShadow && !props.receiveShadow) return

  const scene = stateRef.value.scene as
    | { traverse?: (fn: (child: unknown) => void) => void }
    | undefined
  if (!scene?.traverse) return

  scene.traverse((child: unknown) => {
    if (!isMeshLike(child)) return
    child.castShadow = props.castShadow
    child.receiveShadow = props.receiveShadow
  })
})
</script>

<template>
  <primitive
    v-if="!isLoadingRef.value && stateRef.value?.scene"
    :object="stateRef.value.scene"
    v-bind="$attrs"
  />
</template>
