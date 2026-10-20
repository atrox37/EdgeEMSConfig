<template>
  <section
    class="topology-realtime nodrag"
    :class="{ 'topology-realtime--capped': maxVisible != null }"
    :style="capStyle"
    aria-label="Realtime data"
  >
    <div v-if="card.loading" class="topology-realtime__message">
      Loading data…
    </div>
    <div
      v-else-if="card.error"
      class="topology-realtime__message topology-realtime__error"
    >
      <span>Could not load display points</span>
      <button type="button" @click.stop="context?.retryProduct(productName)">
        Retry
      </button>
    </div>
    <template v-else-if="card.points.length">
      <dl class="topology-realtime__list">
        <div
          v-for="point in card.points"
          :key="point.id"
          class="topology-realtime__row"
        >
          <dt :title="point.name">{{ point.name }}</dt>
          <dd
            :class="{ 'is-missing': point.value === '--' }"
            :title="`${point.value} ${point.unit}`.trim()"
          >
            <span class="topology-realtime__value">{{ point.value }}</span>
            <span v-if="point.unit" class="topology-realtime__unit">{{
              point.unit
            }}</span>
          </dd>
        </div>
      </dl>
      <p v-if="!instanceId" class="topology-realtime__hint">
        No instance bound
      </p>
    </template>
    <div v-else class="topology-realtime__message">
      No default display points
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { TOPOLOGY_REALTIME_KEY } from "../topologyRealtime";

const props = defineProps<{
  productName: string;
  instanceId?: number | null;
  maxVisible?: number;
}>();
const capStyle = computed(() =>
  props.maxVisible == null
    ? undefined
    : { "--topology-realtime-rows": String(props.maxVisible) },
);
const context = inject(TOPOLOGY_REALTIME_KEY, undefined);
const card = computed(
  () =>
    context?.getCardData(props) ?? { points: [], loading: false, error: false },
);
</script>

<style scoped lang="scss">
.topology-realtime {
  min-width: 0;
  margin: 0 12px 10px;
  padding-top: 4px;
  border-top: 1px solid $topology-border;
  color: $topology-text;
  font-size: 12px;
  line-height: 1.4;
}

.topology-realtime__list {
  margin: 0;
}

.topology-realtime__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, auto);
  align-items: baseline;
  gap: 10px;
  padding: 5px 0;

  dt {
    min-width: 0;
    overflow: hidden;
    color: $topology-text-muted;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  dd {
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
    margin: 0;
    text-align: right;
    overflow-wrap: anywhere;
  }
}

.topology-realtime--capped .topology-realtime__list {
  max-height: calc(var(--topology-realtime-rows) * 28px);
  overflow: auto;
  overscroll-behavior: contain;
}
.topology-realtime--capped .topology-realtime__row {
  height: 28px;
  box-sizing: border-box;
  align-items: center;
  padding-top: 0;
  padding-bottom: 0;
}
.topology-realtime--capped .topology-realtime__row dd {
  flex-wrap: nowrap;
  white-space: nowrap;
}
.topology-realtime__row dd.is-missing {
  color: $table-empty-color;
}

.topology-realtime__value {
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.topology-realtime__unit {
  color: $topology-text-subtle;
  font-size: 11px;
}
.topology-realtime__message,
.topology-realtime__hint {
  margin: 0;
  padding: 8px 0;
  color: $topology-text-faint;
}
.topology-realtime__hint {
  padding: 4px 0 0;
  font-size: 11px;
}
.topology-realtime__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  button {
    padding: 2px 4px;
    border: 0;
    background: transparent;
    color: $topology-accent;
    font: inherit;
    cursor: pointer;
  }
}
</style>
