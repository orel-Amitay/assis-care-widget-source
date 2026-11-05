<template>
  <button 
    :class="buttonClasses" 
    :disabled="disabled"
    @click="handleClick"
    :type="type"
  >
    <slot>{{ text }}</slot>
  </button>
</template>

<script>
export default {
  name: 'Button',
  props: {
    text: {
      type: String,
      default: 'Button'
    },
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'success', 'danger', 'warning', 'info'].includes(value)
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    disabled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'button',
      validator: (value) => ['button', 'submit', 'reset'].includes(value)
    },
    rounded: {
      type: Boolean,
      default: false
    },
    outlined: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    buttonClasses() {
      return [
        'btn',
        `btn-${this.variant}`,
        `btn-${this.size}`,
        {
          'btn-rounded': this.rounded,
          'btn-outlined': this.outlined,
          'btn-disabled': this.disabled
        }
      ]
    }
  },
  methods: {
    handleClick(event) {
      if (!this.disabled) {
        this.$emit('click', event)
      }
    }
  }
}
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease-in-out;
  user-select: none;
  white-space: nowrap;
}

.btn:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Size variants */
.btn-small {
  padding: 6px 12px;
  font-size: 14px;
  border-radius: 4px;
}

.btn-medium {
  padding: 8px 16px;
  font-size: 16px;
  border-radius: 6px;
}

.btn-large {
  padding: 12px 24px;
  font-size: 18px;
  border-radius: 8px;
}

/* Rounded variant */
.btn-rounded {
  border-radius: 50px;
}

/* Primary variant */
.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-primary.btn-outlined {
  background-color: transparent;
  color: #3b82f6;
  border: 2px solid #3b82f6;
}

.btn-primary.btn-outlined:hover:not(:disabled) {
  background-color: #3b82f6;
  color: white;
}

/* Secondary variant */
.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.btn-secondary.btn-outlined {
  background-color: transparent;
  color: #6b7280;
  border: 2px solid #6b7280;
}

.btn-secondary.btn-outlined:hover:not(:disabled) {
  background-color: #6b7280;
  color: white;
}

/* Success variant */
.btn-success {
  background-color: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #059669;
}

.btn-success.btn-outlined {
  background-color: transparent;
  color: #10b981;
  border: 2px solid #10b981;
}

.btn-success.btn-outlined:hover:not(:disabled) {
  background-color: #10b981;
  color: white;
}

/* Danger variant */
.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-danger.btn-outlined {
  background-color: transparent;
  color: #ef4444;
  border: 2px solid #ef4444;
}

.btn-danger.btn-outlined:hover:not(:disabled) {
  background-color: #ef4444;
  color: white;
}

/* Warning variant */
.btn-warning {
  background-color: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background-color: #d97706;
}

.btn-warning.btn-outlined {
  background-color: transparent;
  color: #f59e0b;
  border: 2px solid #f59e0b;
}

.btn-warning.btn-outlined:hover:not(:disabled) {
  background-color: #f59e0b;
  color: white;
}

/* Info variant */
.btn-info {
  background-color: #06b6d4;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background-color: #0891b2;
}

.btn-info.btn-outlined {
  background-color: transparent;
  color: #06b6d4;
  border: 2px solid #06b6d4;
}

.btn-info.btn-outlined:hover:not(:disabled) {
  background-color: #06b6d4;
  color: white;
}
</style>
