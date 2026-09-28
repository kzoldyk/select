<script setup lang="ts">
import type { SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends /* @vue-ignore */ SwitchRootProps {
  class?: HTMLAttributes['class']
  checked?: boolean
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  checked: undefined,
  modelValue: undefined,
})

const emits = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:checked', value: boolean): void
}>()

const localValue = computed({
  get: () => {
    if (typeof props.checked === 'boolean') {
      return props.checked
    }
    if (typeof props.modelValue === 'boolean') {
      return props.modelValue
    }
    return false
  },
  set: (val: boolean) => {
    emits('update:modelValue', val)
    emits('update:checked', val)
  },
})

const delegatedProps = reactiveOmit(props, 'class', 'checked', 'modelValue')
</script>

<template>
  <SwitchRoot
    v-bind="delegatedProps"
    v-model="localValue"
    :class="
      cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        props.class,
      )
    "
  >
    <SwitchThumb
      :class="
        cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )
      "
    />
  </SwitchRoot>
</template>
