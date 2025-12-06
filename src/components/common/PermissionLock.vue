<!-- frontend/src/components/common/PermissionLock.vue -->
<script setup>
import { computed } from 'vue';

const props = defineProps({
    hasPermission: {
        type: Boolean,
        required: true
    },
    stepName: {
        type: String,
        required: true
    },
    message: {
        type: String,
        default: 'You do not have permission to edit this step. Please ask the project owner to grant you access.'
    }
});

const showLock = computed(() => !props.hasPermission);
</script>

<template>
    <div class="relative w-full h-full">
        <!-- Main Content -->
        <div :class="{ 'pointer-events-none opacity-50': showLock }">
            <slot></slot>
        </div>

        <!-- Lock Overlay -->
        <div v-if="showLock" 
            class="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm z-50 rounded-lg">
            <div class="text-center px-6 max-w-md">
                <!-- Lock Icon -->
                <div class="mb-4 flex justify-center">
                    <svg class="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z">
                        </path>
                    </svg>
                </div>

                <!-- Message -->
                <h3 class="text-xl font-bold text-red-400 mb-3">
                    🔒 {{ stepName }} - Locked
                </h3>
                <p class="text-gray-300 text-sm leading-relaxed">
                    {{ message }}
                </p>

                <!-- Info Box -->
                <div class="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                    <p class="text-yellow-300 text-xs">
                        <strong>Note:</strong> You can view this step but cannot make changes. 
                        Contact the project owner to request edit permissions.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pointer-events-none {
    pointer-events: none;
}
</style>