<!-- CollapsableInput: collapsable autocomplete container -->

<template>
  <div class="collapsable-input">
    <div class="collapsable-header" :class="{expanded, collapsed: !expanded}" @click="toggleExpanded">
      <div class="collapsable-label heading-font">{{expanded ? expandedLabel : collapsedLabel}}</div>
      <img class="icon-small group-icon"
        v-if="!expanded"
        :src="'https://img.icons8.com/ios/50/000000/forward--v1.png'"
      />
    </div>

    <div class="collapsable-body" v-if="expanded">
      <div class="collapsable-sublabel heading-font" >{{sublabel}}</div>
      <Autocomplete ref="autocomplete" v-model:selection="acSelection" 
        :inputId="inputId"
        :choices="choices" 
        :preselectsData="preselects"
        :placeholder="placeholder"
      />
    </div>
  </div>
</template>

<script>
import Autocomplete from './Autocomplete.vue'

export default {
  name: 'CollapsableInput',
  components: {
    Autocomplete,
  },
  props: {
    /* implementation inputs */
    selection: {
      type: Array,
      required: true,
      description: 'two-way bound autocomplete selection value'
    },
    choices: {
      type: Array,
      required: true,
      description: 'list of values to include in autocomplete dropdown'
    },
    preselects: {
      type: Array,
      description: 'list of choices to provide as selectable cards'
    },

    /* rendering inputs */
    expandedLabel: {
      type: String,
      description: 'label shown only when expanded'
    },
    sublabel: {
      type: String,
      description: 'sublabel, shown only when expanded'
    },
    collapsedLabel: {
      type: String,
      description: 'label shown only when collapsed'
    },
    placeholder: {
      type: String,
      description: 'placeholder to show in autocomplete'
    },
    inputId: {
      type: String,
      description: 'id for input component allowing programtic selection from parent components'
    },

    /* current state inputs */
    expanded: {
      type: Boolean,
      description: 'two-way bound bool if expanded'
    },
  },
  data() {
    return {
      acSelection: [], // middleman value between selection (prop) and Autocomplete's v-model directive, necessary b/c vue 3 doesn't allow direct 'updating' of selection prop
    }
  },
  watch: {
    // jank, but necessary because vue doesn't let us 'update' selection prop directly
    selection(val) {
      this.acSelection = val
    },
    acSelection(val) {
      this.$emit('update:selection', val)
    }
  },
  methods: {
    toggleExpanded() {
      this.$emit('update:expanded', !this.expanded)
    }
  }
}
</script>

<style scoped>
.collapsable-input {
  border: 1px solid gray;
  padding: 15px;
}
.collapsable-input:first-of-type {
  border-bottom: 0;
}

.collapsable-header {
  display: flex;
  justify-content: left;
  align-items: center;
  cursor: pointer;
  margin-bottom: 10px;
}
.collapsable-header.expanded {
  font-size: x-large;
}
.collapsable-header.collapsed {
  font-style: italic;
  color: gray;
  margin-bottom: 0;
}

.collapsable-label {
  font-size: larger;
  font-weight: 500;
  text-align: start;
  margin-right: 10px;
}
.collapsable-sublabel {
  text-align: start;
  font-style: italic;
  margin-bottom: 10px;
}
</style>
