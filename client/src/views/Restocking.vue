<template>
  <div class="restocking">
    <!-- Section A: Budget Control -->
    <div class="page-header">
      <h2>Restocking Planner</h2>
      <p>
        Allocate budget to restock high-demand items based on demand forecasts
      </p>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Budget Control</h3>
      </div>
      <div class="budget-control">
        <div class="budget-display">{{ formatCurrency(budget) }}</div>
        <input
          type="range"
          class="budget-slider"
          v-model.number="budget"
          min="0"
          max="200000"
          step="5000"
        />
        <div class="slider-labels">
          <span>$0</span>
          <span>$200,000</span>
        </div>
        <div class="budget-meta">
          <span class="meta-item">
            Remaining Budget:
            <strong>{{
              formatCurrency(recommendations.remaining_budget)
            }}</strong>
          </span>
          <span class="meta-separator">|</span>
          <span class="meta-item">
            Items Selected:
            <strong
              >{{ selectedItems.length }} of
              {{ recommendations.items.length }}</strong
            >
          </span>
        </div>
      </div>
    </div>

    <!-- Section B: Recommendations Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Recommended Items</h3>
      </div>

      <!-- Empty state when budget is zero -->
      <div v-if="budget === 0" class="empty-state">
        Set a budget above to see recommendations
      </div>

      <!-- Loading state -->
      <div v-else-if="loading" class="loading">Loading...</div>

      <!-- Table -->
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item Name</th>
              <th>Trend</th>
              <th>Forecasted Qty</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <!-- Selected items (within budget) -->
            <tr
              v-for="item in selectedItems"
              :key="item.item_sku"
              class="row-selected"
            >
              <td>
                <strong>{{ item.item_sku }}</strong>
              </td>
              <td>{{ item.item_name }}</td>
              <td>
                <span :class="['badge', item.trend]">{{ item.trend }}</span>
              </td>
              <td>{{ item.forecasted_demand.toLocaleString() }}</td>
              <td>{{ formatCurrency(item.unit_cost) }}</td>
              <td>{{ formatCurrency(item.total_cost) }}</td>
            </tr>

            <!-- Separator row when there are over-budget items -->
            <tr
              v-if="overBudgetItems.length > 0 && selectedItems.length > 0"
              class="separator-row"
            >
              <td colspan="6" class="separator-cell">
                — Items below exceed remaining budget —
              </td>
            </tr>

            <!-- Over-budget items (greyed out) -->
            <tr
              v-for="item in overBudgetItems"
              :key="item.item_sku"
              class="row-over-budget"
            >
              <td>
                <strong>{{ item.item_sku }}</strong>
              </td>
              <td>{{ item.item_name }}</td>
              <td>
                <span :class="['badge', item.trend]">{{ item.trend }}</span>
              </td>
              <td>{{ item.forecasted_demand.toLocaleString() }}</td>
              <td>{{ formatCurrency(item.unit_cost) }}</td>
              <td>{{ formatCurrency(item.total_cost) }}</td>
            </tr>

            <!-- No items at all -->
            <tr v-if="recommendations.items.length === 0">
              <td colspan="6" class="empty-cell">
                No recommendations available
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section C: Order Summary + Action -->
    <div v-if="selectedItems.length > 0" class="card">
      <div class="card-header">
        <h3 class="card-title">Order Summary</h3>
      </div>

      <!-- Success state -->
      <div v-if="lastOrder" class="success-box">
        <div class="success-title">Order Placed Successfully</div>
        <div class="success-detail">
          <span class="detail-label">Order Number:</span>
          <span class="detail-value">{{ lastOrder.order_number }}</span>
        </div>
        <div class="success-detail">
          <span class="detail-label">Expected Delivery:</span>
          <span class="detail-value">{{
            formatDeliveryDate(lastOrder.expected_delivery)
          }}</span>
        </div>
        <button class="btn-primary" @click="resetOrder">
          Place Another Order
        </button>
      </div>

      <!-- Normal order action state -->
      <div v-else class="order-action">
        <div class="order-summary-line">
          <span class="summary-count">{{ selectedItems.length }} items</span>
          <span class="summary-sep">|</span>
          <span class="summary-total"
            >Total:
            <strong>{{
              formatCurrency(recommendations.total_selected)
            }}</strong></span
          >
        </div>
        <button
          class="btn-primary"
          :disabled="submitting"
          :class="{ 'btn-disabled': submitting }"
          @click="placeOrder"
        >
          {{ submitting ? "Placing Order..." : "Place Order" }}
        </button>
        <div v-if="orderError" class="error order-error">{{ orderError }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import { api } from "../api";

export default {
  name: "Restocking",
  setup() {
    const budget = ref(50000);
    const recommendations = ref({
      items: [],
      budget: 0,
      total_selected: 0,
      remaining_budget: 0,
    });
    const loading = ref(false);
    const submitting = ref(false);
    // Holds the successfully placed order response, or null when in the normal state
    const lastOrder = ref(null);
    const orderError = ref(null);

    const selectedItems = computed(() =>
      recommendations.value.items.filter((i) => i.selected),
    );
    const overBudgetItems = computed(() =>
      recommendations.value.items.filter((i) => !i.selected),
    );

    const formatCurrency = (value) =>
      (value || 0).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });

    const formatDeliveryDate = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const fetchRecommendations = async () => {
      // Skip fetching when budget is 0 — the template shows the empty state instead
      if (budget.value === 0) {
        recommendations.value = {
          items: [],
          budget: 0,
          total_selected: 0,
          remaining_budget: 0,
        };
        return;
      }
      loading.value = true;
      try {
        recommendations.value = await api.getRestockingRecommendations(
          budget.value,
        );
      } finally {
        loading.value = false;
      }
    };

    const placeOrder = async () => {
      submitting.value = true;
      orderError.value = null;
      try {
        const items = selectedItems.value.map((i) => ({
          item_sku: i.item_sku,
          item_name: i.item_name,
          quantity: i.forecasted_demand,
          unit_cost: i.unit_cost,
          total_cost: i.total_cost,
        }));
        lastOrder.value = await api.submitRestockingOrder(items);
      } catch (err) {
        orderError.value = "Failed to place order. Please try again.";
        console.error("Order placement failed:", err);
      } finally {
        submitting.value = false;
      }
    };

    const resetOrder = () => {
      // Clear the success state and re-fetch so the user can place another order
      lastOrder.value = null;
      orderError.value = null;
      fetchRecommendations();
    };

    watch(budget, fetchRecommendations);
    onMounted(fetchRecommendations);

    return {
      budget,
      recommendations,
      loading,
      submitting,
      lastOrder,
      orderError,
      selectedItems,
      overBudgetItems,
      formatCurrency,
      formatDeliveryDate,
      fetchRecommendations,
      placeOrder,
      resetOrder,
    };
  },
};
</script>

<style scoped>
.restocking {
  padding-bottom: 2rem;
}

/* Budget Control */
.budget-control {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.budget-display {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.budget-slider {
  width: 100%;
  accent-color: #2563eb;
  height: 6px;
  cursor: pointer;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: -0.25rem;
}

.budget-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #64748b;
}

.meta-item strong {
  color: #0f172a;
}

.meta-separator {
  color: #cbd5e1;
}

/* Table rows */
.row-selected {
  /* inherits default table row styling */
}

.row-over-budget {
  opacity: 0.45;
}

.separator-row {
  background: #f8fafc;
}

.separator-cell {
  text-align: center;
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
  padding: 0.5rem 0.75rem;
  letter-spacing: 0.025em;
}

.empty-cell {
  text-align: center;
  color: #94a3b8;
  padding: 2rem;
}

/* Empty state */
.empty-state {
  padding: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 0.938rem;
}

/* Order Summary Section */
.order-action {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-summary-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.938rem;
  color: #475569;
}

.summary-sep {
  color: #cbd5e1;
}

.summary-total strong {
  color: #0f172a;
}

.summary-count {
  font-weight: 600;
}

.btn-primary {
  display: inline-block;
  background: #2563eb;
  color: white;
  padding: 0.625rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 0.938rem;
  transition: background 0.15s ease;
  align-self: flex-start;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled,
.btn-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-error {
  margin-top: 0;
}

/* Success box */
.success-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.success-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #065f46;
}

.success-detail {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-label {
  color: #374151;
  font-weight: 600;
  min-width: 130px;
}

.detail-value {
  color: #0f172a;
  font-weight: 500;
}
</style>
