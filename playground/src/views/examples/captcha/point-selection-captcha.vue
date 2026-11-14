<script lang="ts" setup>
import type { CaptchaPoint } from '@vben/common-ui';

import { reactive, ref } from 'vue';

import { Page, PointSelectionCaptcha } from '@vben/common-ui';

import { Card, Input, InputNumber, message, Switch } from 'antdv-next';

import { $t } from '#/locales';

const DEFAULT_CAPTCHA_IMAGE =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%232563eb%22%2F%3E%3Crect%20x%3D%2214%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2230%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2213%22%20rx%3D%224%22%20fill%3D%22%23bfdbfe%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2235%22%20width%3D%2215%22%20height%3D%2212%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E';

const DEFAULT_HINT_IMAGE =
  'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2212%22%20fill%3D%22%232563eb%22%2F%3E%3Crect%20x%3D%2214%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2230%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2217%22%20width%3D%2215%22%20height%3D%2213%22%20rx%3D%224%22%20fill%3D%22%23bfdbfe%22%2F%3E%3Crect%20x%3D%2235%22%20y%3D%2235%22%20width%3D%2215%22%20height%3D%2212%22%20rx%3D%224%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fsvg%3E';

const selectedPoints = ref<CaptchaPoint[]>([]);
const params = reactive({
  captchaImage: '',
  captchaImageUrl: DEFAULT_CAPTCHA_IMAGE,
  height: undefined,
  hintImage: '',
  hintImageUrl: DEFAULT_HINT_IMAGE,
  hintText: '唇，燕，碴，找',
  paddingX: undefined,
  paddingY: undefined,
  showConfirm: true,
  showHintImage: false,
  title: '',
  width: undefined,
});
const handleConfirm = (points: CaptchaPoint[], clear: () => void) => {
  message.success({
    content: `captcha points: ${JSON.stringify(points)}`,
  });
  clear();
  selectedPoints.value = [];
};
const handleRefresh = () => {
  selectedPoints.value = [];
};
const handleClick = (point: CaptchaPoint) => {
  selectedPoints.value.push(point);
};
</script>

<template>
  <Page
    :description="$t('examples.captcha.pageDescription')"
    :title="$t('examples.captcha.pageTitle')"
  >
    <Card :title="$t('examples.captcha.basic')" class="mb-4 overflow-x-auto">
      <div class="mb-3 flex items-center justify-start">
        <Input
          v-model:value="params.title"
          :placeholder="$t('examples.captcha.titlePlaceholder')"
          class="w-64"
        />
        <Input
          v-model:value="params.captchaImageUrl"
          :placeholder="$t('examples.captcha.captchaImageUrlPlaceholder')"
          class="ml-8 w-64"
        />
        <div class="ml-8 flex w-96 items-center">
          <Switch
            v-model="params.showHintImage"
            :checked-children="$t('examples.captcha.hintImage')"
            :un-checked-children="$t('examples.captcha.hintText')"
            class="mr-4 w-40"
          />
          <Input
            v-show="params.showHintImage"
            v-model:value="params.hintImageUrl"
            :placeholder="$t('examples.captcha.hintImagePlaceholder')"
          />
          <Input
            v-show="!params.showHintImage"
            v-model:value="params.hintText"
            :placeholder="$t('examples.captcha.hintTextPlaceholder')"
          />
        </div>

        <Switch
          v-model="params.showConfirm"
          :checked-children="$t('examples.captcha.showConfirm')"
          :un-checked-children="$t('examples.captcha.hideConfirm')"
          class="ml-8 w-28"
        />
      </div>
      <div class="mb-3 flex items-center justify-start">
        <div>
          <InputNumber
            v-model:value="params.width"
            :min="1"
            :placeholder="$t('examples.captcha.widthPlaceholder')"
            :precision="0"
            :step="1"
            class="w-64"
          >
            <template #addonAfter>px</template>
          </InputNumber>
        </div>
        <div class="ml-8">
          <InputNumber
            v-model:value="params.height"
            :min="1"
            :placeholder="$t('examples.captcha.heightPlaceholder')"
            :precision="0"
            :step="1"
            class="w-64"
          >
            <template #addonAfter>px</template>
          </InputNumber>
        </div>
        <div class="ml-8">
          <InputNumber
            v-model:value="params.paddingX"
            :min="1"
            :placeholder="$t('examples.captcha.paddingXPlaceholder')"
            :precision="0"
            :step="1"
            class="w-64"
          >
            <template #addonAfter>px</template>
          </InputNumber>
        </div>
        <div class="ml-8">
          <InputNumber
            v-model:value="params.paddingY"
            :min="1"
            :placeholder="$t('examples.captcha.paddingYPlaceholder')"
            :precision="0"
            :step="1"
            class="w-64"
          >
            <template #addonAfter>px</template>
          </InputNumber>
        </div>
      </div>

      <PointSelectionCaptcha
        :captcha-image="params.captchaImageUrl || params.captchaImage"
        :height="params.height || 220"
        :hint-image="
          params.showHintImage ? params.hintImageUrl || params.hintImage : ''
        "
        :hint-text="params.hintText"
        :padding-x="params.paddingX"
        :padding-y="params.paddingY"
        :show-confirm="params.showConfirm"
        :width="params.width || 300"
        class="float-left"
        @click="handleClick"
        @confirm="handleConfirm"
        @refresh="handleRefresh"
      >
        <template #title>
          {{ params.title || $t('examples.captcha.captchaCardTitle') }}
        </template>
      </PointSelectionCaptcha>

      <ol class="float-left p-5">
        <li v-for="point in selectedPoints" :key="point.i" class="flex">
          <span class="mr-3 w-16">{{
            $t('examples.captcha.index') + point.i
          }}</span>
          <span class="mr-3 w-52">{{
            $t('examples.captcha.timestamp') + point.t
          }}</span>
          <span class="mr-3 w-16">{{
            $t('examples.captcha.x') + point.x
          }}</span>
          <span class="mr-3 w-16">{{
            $t('examples.captcha.y') + point.y
          }}</span>
        </li>
      </ol>
    </Card>
  </Page>
</template>
