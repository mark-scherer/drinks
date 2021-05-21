<!-- Switch: custom switch -->
<!-- modelValue is two-way bound to caller's input to v-model -->
  <!-- 'modelValue' name forced by vue 3: https://v3.vuejs.org/guide/forms.html#basic-usage -->

<template>
  <div class="switch" >
    <span
      class="switch-wrapper"
      role="checkbox"
      :aria-checked="modelValue.toString()"
      :value="modelValue"
      @click = 'toggle'
    >
      <span class="switch-background" :class="{'switch-background-active': modelValue}"/>
      <span class="switch-rocker" :class="{'switch-rocker-active': modelValue}" />
    </span>
  </div>
</template>

<script>
export default {
  name: 'Switch',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    }
  },
  emits: ['update:modelValue'],
  methods: {
    toggle() {
      console.log(`toggling switch to: ${!this.modelValue}`)
      this.$emit('update:modelValue', !this.modelValue)
    }
  }
}
</script>

<style scoped>
  .switch {
    margin-left: 20px;
  }
  .switch-wrapper {
    display: inline-block;
    position: relative;
    cursor: pointer;
    width: 32px;
    height: 18px;
  }
  .switch-background {
    background: #dbdbdb;
    border-radius: 9999px;
    width: 32px;
    height: 18px;
    position: absolute;
    left: 0;
    bottom: 0;
    transition: background 0.4s ease;
  }
  .switch-background-active {
    background: #3b3b3b;
  }
  .switch-rocker {
    position: absolute;
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    border-radius: 9999px;
    background: #8a8a8a; 
    transition: transform 0.4s ease;
  }
  .switch-rocker-active {
    transform: translateX(14px);
  }
</style>
