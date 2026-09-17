<template>

  <div class="section basic-section">

    <div class="section__header">

      <span class="section__title">Basic Settings</span>

    </div>

    <div class="section__body section__body--basic">

      <el-form-item label="label:" prop="label" class="basic-item basic-item--label">

        <el-input

          v-model="cardData.label"

          placeholder="Enter label"

          :maxlength="RULE_CARD_LABEL_MAX_LENGTH"

        />

      </el-form-item>

      <el-form-item label="description:" prop="description" class="basic-item basic-item--description">

        <el-input

          v-model="cardData.description"

          placeholder="Enter description"

          :maxlength="RULE_CARD_DESCRIPTION_MAX_LENGTH"

        />

      </el-form-item>

    </div>

  </div>

</template>



<script setup lang="ts">

import {

  RULE_CARD_DESCRIPTION_MAX_LENGTH,

  RULE_CARD_LABEL_MAX_LENGTH,

} from '@/constants/ruleCardForm'



defineProps<{

  cardData: {

    label?: string

    description?: string

  }

}>()

</script>


