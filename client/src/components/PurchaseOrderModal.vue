<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && backlogItem" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">
              {{
                mode === "create"
                  ? "Create Purchase Order"
                  : "Purchase Order Details"
              }}
            </h3>
            <button class="close-button" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Item context header -->
            <div class="item-context">
              <div class="context-label">Backlog Item</div>
              <div class="context-value">{{ backlogItem.item_name }}</div>
              <div class="context-sku">SKU: {{ backlogItem.item_sku }}</div>
            </div>

            <!-- Create mode: form -->
            <form
              v-if="mode === 'create'"
              class="po-form"
              @submit.prevent="handleSubmit"
            >
              <div class="form-group">
                <label class="form-label" for="po-quantity">Quantity</label>
                <input
                  id="po-quantity"
                  v-model.number="form.quantity"
                  type="number"
                  min="1"
                  required
                  class="form-input"
                  :placeholder="`Shortage: ${shortage} units`"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="po-supplier">Supplier</label>
                <input
                  id="po-supplier"
                  v-model="form.supplier"
                  type="text"
                  required
                  class="form-input"
                  placeholder="Supplier name"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="po-delivery"
                  >Estimated Delivery Date</label
                >
                <input
                  id="po-delivery"
                  v-model="form.estimated_delivery"
                  type="date"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-actions">
                <button type="button" class="btn-secondary" @click="close">
                  Cancel
                </button>
                <button type="submit" class="btn-primary">
                  Create Purchase Order
                </button>
              </div>
            </form>

            <!-- View mode: read-only fields -->
            <div
              v-else-if="mode === 'view' && backlogItem.purchase_order"
              class="po-view"
            >
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">PO ID</div>
                  <div class="info-value po-id">
                    {{ backlogItem.purchase_order.id }}
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-label">Supplier</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.supplier }}
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-label">Quantity</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.quantity }} units
                  </div>
                </div>

                <div class="info-item">
                  <div class="info-label">Estimated Delivery</div>
                  <div class="info-value">
                    {{
                      formatDate(backlogItem.purchase_order.estimated_delivery)
                    }}
                  </div>
                </div>

                <div class="info-item" v-if="backlogItem.purchase_order.status">
                  <div class="info-label">Status</div>
                  <div class="info-value">
                    <span
                      class="badge"
                      :class="backlogItem.purchase_order.status"
                    >
                      {{ backlogItem.purchase_order.status }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="mode === 'view'" class="no-po">
              No purchase order on record for this item.
            </div>
          </div>

          <div v-if="mode === 'view'" class="modal-footer">
            <button class="btn-secondary" @click="close">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { ref, computed } from "vue";

export default {
  name: "PurchaseOrderModal",
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    backlogItem: {
      type: Object,
      default: null,
    },
    mode: {
      type: String,
      default: "create",
      validator: (v) => ["create", "view"].includes(v),
    },
  },
  emits: ["close", "po-created"],
  setup(props, { emit }) {
    const form = ref({
      quantity: null,
      supplier: "",
      estimated_delivery: "",
    });

    // Shortage is how many units are needed beyond what is available
    const shortage = computed(() => {
      if (!props.backlogItem) return 0;
      return (
        props.backlogItem.quantity_needed - props.backlogItem.quantity_available
      );
    });

    const close = () => {
      // Reset form state when closing so it is clean on next open
      form.value = { quantity: null, supplier: "", estimated_delivery: "" };
      emit("close");
    };

    const handleSubmit = () => {
      const payload = {
        id: "po-" + Date.now(),
        backlog_item_id: props.backlogItem.id,
        quantity: form.value.quantity,
        supplier: form.value.supplier,
        estimated_delivery: form.value.estimated_delivery,
      };
      emit("po-created", payload);
      emit("close");
      // Reset form after emitting so it is clean for the next open
      form.value = { quantity: null, supplier: "", estimated_delivery: "" };
    };

    const formatDate = (dateString) => {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    return {
      form,
      shortage,
      close,
      handleSubmit,
      formatDate,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  max-width: 560px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.close-button {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.item-context {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.context-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.context-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.25rem;
}

.context-sku {
  font-size: 0.875rem;
  color: #64748b;
  font-family: "Monaco", "Courier New", monospace;
}

/* Form styles */
.po-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.form-input {
  padding: 0.625rem 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.938rem;
  color: #0f172a;
  background: #fff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input::placeholder {
  color: #94a3b8;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

/* View mode styles */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.info-value {
  font-size: 0.938rem;
  color: #0f172a;
  font-weight: 500;
}

.info-value.po-id {
  font-family: "Monaco", "Courier New", monospace;
  color: #2563eb;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: capitalize;
  background: #dbeafe;
  color: #1e40af;
}

.badge.pending {
  background: #fed7aa;
  color: #92400e;
}

.badge.confirmed {
  background: #dcfce7;
  color: #166534;
}

.badge.cancelled {
  background: #fecaca;
  color: #991b1b;
}

.no-po {
  font-size: 0.938rem;
  color: #64748b;
  text-align: center;
  padding: 2rem 0;
}

/* Footer */
.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Buttons */
.btn-secondary {
  padding: 0.625rem 1.25rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
