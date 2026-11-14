<script setup lang="ts">
import type {
  FormInstance,
  TableColumnsType,
  UploadProps,
} from 'ant-design-vue';

import type { Music, MusicInput } from '#/api/music';

import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';

import {
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  InputSearch,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Textarea,
  Upload,
} from 'ant-design-vue';

import { captureContext } from '#/api/context-lifecycle';
import {
  getMusic,
  MusicUploadError,
  normalizeMusicFile,
  previewMusic,
  saveMusic,
  uploadMusic,
} from '#/api/music';
import { formatFileSize } from '#/components/management/activity-media';
import ListShell from '#/components/management/list-shell.vue';

const items = ref<Music[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const appliedKeyword = ref('');
const keyword = ref('');
const status = ref<'active' | 'disabled'>();
const failed = ref(false);
const loading = ref(false);
const open = ref(false);
const saving = ref(false);
const audioUrl = ref('');
const auditionId = ref('');
const file = ref<File>();
const previewingId = ref('');
const selectedId = ref('');
const localAudio = ref('');
const emptyForm = (): MusicInput => ({
  name: '',
  fileUrl: '',
  size: 0,
  contentType: '',
  licenseSource: '',
  status: 'active',
  sortOrder: 0,
  version: 0,
});
const form = reactive<MusicInput>(emptyForm());
const formRef = ref<FormInstance>();
const rules = {
  name: [{ required: true, whitespace: true, message: '请输入音乐名称' }],
  licenseSource: [
    {
      required: true,
      whitespace: true,
      message: '请填写授权来源及商业使用依据',
    },
  ],
};
let editSerial = 0;
let listSerial = 0;
let previewSerial = 0;
const columns: TableColumnsType<Music> = [
  {
    title: '音乐名称',
    dataIndex: 'name',
    ellipsis: true,
    width: 220,
    fixed: 'left',
  },
  { title: '状态', key: 'status', width: 90 },
  { title: '授权来源', dataIndex: 'licenseSource', ellipsis: true },
  { title: '文件大小', key: 'size', width: 110 },
  { title: '排序', dataIndex: 'sortOrder', width: 80 },
  { title: '更新时间', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'actions', fixed: 'right', width: 180 },
];
async function load() {
  const serial = ++listSerial;
  loading.value = true;
  failed.value = false;
  items.value = [];
  total.value = 0;
  try {
    const result = await getMusic({
      page: page.value,
      pageSize: pageSize.value,
      keyword: appliedKeyword.value || undefined,
      status: status.value,
    });
    if (serial !== listSerial) return;
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (serial === listSerial) failed.value = true;
  } finally {
    if (serial === listSerial) loading.value = false;
  }
}
function search() {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  void load();
}
function change(current: number, size: number) {
  page.value = size === pageSize.value ? current : 1;
  pageSize.value = size;
  void load();
}
function clearLocal() {
  if (localAudio.value) URL.revokeObjectURL(localAudio.value);
  localAudio.value = '';
}
function closePreview() {
  ++previewSerial;
  audioUrl.value = '';
  auditionId.value = '';
  previewingId.value = '';
}
function show(row?: Music) {
  ++editSerial;
  clearLocal();
  closePreview();
  file.value = undefined;
  selectedId.value = row?.id ?? '';
  Object.assign(form, emptyForm(), row ?? {});
  formRef.value?.clearValidate();
  open.value = true;
}
function close() {
  if (saving.value) return;
  ++editSerial;
  open.value = false;
  file.value = undefined;
  clearLocal();
}
const selectFile: UploadProps['beforeUpload'] = (value) => {
  if (saving.value) return Upload.LIST_IGNORE;
  try {
    const normalized = normalizeMusicFile(value);
    clearLocal();
    file.value = normalized;
    localAudio.value = URL.createObjectURL(normalized);
    if (!form.name)
      form.name = value.name.replace(/\.[^.]+$/, '').slice(0, 120);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '音乐无法使用');
  }
  return Upload.LIST_IGNORE;
};
async function submit() {
  if (saving.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (saving.value) return;
  if (!file.value && !form.fileUrl) {
    message.warning('请选择音乐文件');
    return;
  }
  const context = captureContext();
  const serial = editSerial;
  saving.value = true;
  try {
    if (file.value) {
      const pending = file.value;
      const url = await uploadMusic(pending);
      context.assertCurrent();
      if (serial !== editSerial) return;
      form.fileUrl = url;
      form.size = pending.size;
      form.contentType = pending.type;
      file.value = undefined; // Reuse this upload if saving the metadata fails.
    }
    await saveMusic(selectedId.value, { ...form });
    context.assertCurrent();
    if (serial !== editSerial) return;
    message.success('音乐已保存');
    open.value = false;
    clearLocal();
    void load();
  } catch (error) {
    if (serial === editSerial && error instanceof MusicUploadError)
      message.error(error.message);
  } finally {
    if (serial === editSerial) saving.value = false;
  }
}
async function audition(row: Music) {
  closePreview();
  const serial = ++previewSerial;
  previewingId.value = row.id;
  try {
    const result = await previewMusic(row.id, true);
    if (serial !== previewSerial) return;
    audioUrl.value = result.url;
    auditionId.value = row.id;
  } catch {
    /* API client displays the error. */
  } finally {
    if (serial === previewSerial) previewingId.value = '';
  }
}
async function toggle(row: Music) {
  const context = captureContext();
  try {
    await saveMusic(row.id, {
      ...row,
      status: row.status === 'active' ? 'disabled' : 'active',
    });
    context.assertCurrent();
    closePreview();
    message.success(row.status === 'active' ? '音乐已停用' : '音乐已启用');
    void load();
  } catch {
    /* API client displays the error. */
  }
}
onMounted(load);
onBeforeUnmount(() => {
  ++listSerial;
  ++editSerial;
  clearLocal();
  closePreview();
});
</script>
<template>
  <ListShell
    title="音乐管理"
    v-bind="{ loading, failed, page, pageSize, total }"
    @reload="load"
    @change="change"
  >
    <template #extra>
      <Button type="primary" @click="show()">新增音乐</Button>
    </template>
    <template #filters>
      <InputSearch
        v-model:value="keyword"
        placeholder="搜索音乐名称"
        allow-clear
        @search="search"
      />
      <Select
        v-model:value="status"
        placeholder="全部状态"
        allow-clear
        :options="[
          { label: '已启用', value: 'active' },
          { label: '已停用', value: 'disabled' },
        ]"
        @change="search"
      />
    </template>
    <Table
      row-key="id"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      :scroll="{ x: 1000 }"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="record.status === 'active' ? 'success' : 'default'"
        >
          {{ record.status === 'active' ? '已启用' : '已停用' }}
        </Tag>
        <template v-else-if="column.key === 'size'">
          {{ formatFileSize(record.size) }}
        </template>
        <template v-else-if="column.key === 'updatedAt'">
          {{ new Date(record.updatedAt).toLocaleString() }}
        </template>
        <Space v-else-if="column.key === 'actions'" :size="0">
          <Button
            type="link"
            size="small"
            :loading="previewingId === record.id"
            @click="audition(record as Music)"
          >
            试听
          </Button>
          <Button type="link" size="small" @click="show(record as Music)">
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            :danger="record.status === 'active'"
            @click="toggle(record as Music)"
          >
            {{ record.status === 'active' ? '停用' : '启用' }}
          </Button>
        </Space>
      </template>
      <template #emptyText><Empty description="暂无匹配的音乐" /></template>
    </Table>
    <template #dialogs>
      <Modal
        :open="open"
        :title="selectedId ? '编辑音乐' : '新增音乐'"
        :confirm-loading="saving"
        :cancel-button-props="{ disabled: saving }"
        :closable="!saving"
        :mask-closable="!saving"
        :keyboard="!saving"
        :width="600"
        @ok="submit"
        @cancel="close"
      >
        <Form
          ref="formRef"
          :model="form"
          :rules="rules"
          layout="vertical"
          :disabled="saving"
        >
          <FormItem label="音乐名称" name="name">
            <Input
              v-model:value="form.name"
              :maxlength="120"
              placeholder="请输入音乐名称"
            />
          </FormItem>
          <FormItem label="音乐文件" required>
            <Space wrap>
              <Upload
                :before-upload="selectFile"
                :show-upload-list="false"
                accept=".mp3,.m4a,.wav,.ogg"
                :disabled="saving"
              >
                <Button :disabled="saving">
                  {{ file || form.fileUrl ? '更换音乐' : '选择音乐' }}
                </Button>
              </Upload>
              <span class="text-sm text-muted-foreground">{{
                file?.name ||
                (form.fileUrl ? '已上传' : 'MP3、M4A、WAV、OGG，最大10MB')
              }}</span>
            </Space>
            <audio
              v-if="localAudio"
              :src="localAudio"
              controls
              class="mt-2 h-9 w-full"
            ></audio>
          </FormItem>
          <FormItem
            label="授权来源"
            name="licenseSource"
            extra="请确认音乐可用于商业活动，并填写来源、授权协议或自有版权说明。"
          >
            <Textarea
              v-model:value="form.licenseSource"
              :rows="3"
              :maxlength="2000"
              placeholder="例如：平台自制音乐，或已获商业授权的来源及证明"
            />
          </FormItem>
          <div class="grid grid-cols-2 gap-4">
            <FormItem label="状态">
              <Select
                v-model:value="form.status"
                :options="[
                  { label: '已启用', value: 'active' },
                  { label: '已停用', value: 'disabled' },
                ]"
              />
            </FormItem>
            <FormItem label="排序">
              <InputNumber
                v-model:value="form.sortOrder"
                :min="0"
                :max="1000000"
                :precision="0"
                class="w-full"
              />
            </FormItem>
          </div>
        </Form>
      </Modal>
      <Modal
        :open="!!auditionId"
        title="音乐试听"
        :footer="null"
        destroy-on-close
        @cancel="closePreview"
      >
        <audio
          v-if="audioUrl"
          :src="audioUrl"
          controls
          autoplay
          class="w-full"
          @error="message.error('音乐暂时无法播放，请重新试听')"
        ></audio>
      </Modal>
    </template>
  </ListShell>
</template>
