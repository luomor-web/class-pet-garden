<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Rule } from "@/types";
import { useAuth } from "@/composables/useAuth";
import { useToast } from "@/composables/useToast";
import { useConfirm } from "@/composables/useConfirm";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import PageLayout from "@/components/layout/PageLayout.vue";

interface Tag {
  id: string;
  name: string;
  color: string;
}

const { api } = useAuth();
const toast = useToast();
const { confirmDialog, showConfirm, closeConfirm } = useConfirm();

const activeTab = ref<"rules" | "tags" | "revival">("rules");
const isLoading = ref(true);
const rules = ref<Rule[]>([]);
const tags = ref<Tag[]>([]);

const categories = ["学习", "行为", "健康", "其他"];
const newRuleName = ref("");
const newRulePoints = ref(1);
const newRuleCategory = ref("学习");

const newTagName = ref("");
const newTagColor = ref("#6366f1");
const presetColors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#78716c",
];

const editingRule = ref<Rule | null>(null);
const editName = ref("");
const editPoints = ref(1);
const editCategory = ref("学习");

const editingTag = ref<Tag | null>(null);
const editTagName = ref("");
const editTagColor = ref("");

// 复活任务相关
const revivalEnabled = ref(false);
const presetTasks = ref<Array<{ id: string; name: string; description?: string; is_preset: boolean; is_enabled: boolean }>>([]);
const customTasks = ref<Array<{ id: string; name: string; description?: string; is_preset: boolean; is_enabled: boolean }>>([]);
const newTaskName = ref("");
const newTaskDesc = ref("");
const editingTask = ref<{ id: string; name: string; description?: string } | null>(null);
const editTaskName = ref("");
const editTaskDesc = ref("");

const rulesByCategory = computed(() => {
  const grouped: Record<string, Rule[]> = {};
  for (const cat of categories)
    grouped[cat] = rules.value.filter((r) => r.category === cat);
  return grouped;
});

async function loadRules() {
  try {
    const res = await api.get("/rules");
    rules.value = res.data.rules;
  } catch (e) {
    console.error("加载规则失败:", e);
  }
}
async function loadTags() {
  try {
    const res = await api.get("/tags");
    tags.value = res.data.tags;
  } catch (e) {
    console.error("加载标签失败:", e);
  }
}

async function addRule() {
  if (!newRuleName.value.trim()) {
    toast.warning("请输入规则名称");
    return;
  }
  try {
    await api.post("/rules", {
      name: newRuleName.value.trim(),
      points: newRulePoints.value,
      category: newRuleCategory.value,
    });
    toast.success("添加成功！");
    newRuleName.value = "";
    newRulePoints.value = 1;
    await loadRules();
  } catch (e) {
    toast.error("添加失败");
  }
}

function startEditRule(rule: Rule) {
  editingRule.value = rule;
  editName.value = rule.name;
  editPoints.value = rule.points;
  editCategory.value = rule.category;
}
function cancelEditRule() {
  editingRule.value = null;
}

async function saveEditRule() {
  if (!editingRule.value || !editName.value.trim()) return;
  try {
    await api.put(`/rules/${editingRule.value.id}`, {
      name: editName.value.trim(),
      points: editPoints.value,
      category: editCategory.value,
    });
    toast.success("更新成功！");
    editingRule.value = null;
    await loadRules();
  } catch (e) {
    toast.error("更新失败");
  }
}

async function deleteRule(id: string) {
  showConfirm({
    title: "删除规则",
    message: "确定删除该规则？",
    confirmText: "删除",
    type: "danger",
    onConfirm: async () => {
      try {
        await api.delete(`/rules/${id}`);
        toast.success("删除成功！");
        await loadRules();
      } catch (e) {
        toast.error("删除失败");
      }
    },
  });
}

async function resetRules() {
  showConfirm({
    title: "重置规则",
    message: "确定重置为默认规则？",
    confirmText: "重置",
    type: "danger",
    onConfirm: async () => {
      try {
        const res = await api.post("/rules/reset");
        rules.value = res.data.rules;
        toast.success(`已重置，共 ${res.data.count} 条`);
      } catch (e) {
        toast.error("重置失败");
      }
    },
  });
}

async function addTag() {
  if (!newTagName.value.trim()) {
    toast.warning("请输入标签名称");
    return;
  }
  try {
    await api.post("/tags", {
      name: newTagName.value.trim(),
      color: newTagColor.value,
    });
    toast.success("添加成功！");
    newTagName.value = "";
    newTagColor.value =
      presetColors[Math.floor(Math.random() * presetColors.length)];
    await loadTags();
  } catch (e: any) {
    toast.error(e.response?.data?.error || "添加失败");
  }
}

function startEditTag(tag: Tag) {
  editingTag.value = tag;
  editTagName.value = tag.name;
  editTagColor.value = tag.color;
}
function cancelEditTag() {
  editingTag.value = null;
}

async function saveEditTag() {
  if (!editingTag.value || !editTagName.value.trim()) return;
  try {
    await api.put(`/tags/${editingTag.value.id}`, {
      name: editTagName.value.trim(),
      color: editTagColor.value,
    });
    toast.success("更新成功！");
    editingTag.value = null;
    await loadTags();
  } catch (e: any) {
    toast.error(e.response?.data?.error || "更新失败");
  }
}

async function deleteTag(id: string) {
  showConfirm({
    title: "删除标签",
    message: "确定删除该标签？",
    confirmText: "删除",
    type: "danger",
    onConfirm: async () => {
      try {
        await api.delete(`/tags/${id}`);
        toast.success("删除成功！");
        await loadTags();
      } catch (e) {
        toast.error("删除失败");
      }
    },
  });
}

// ===== 复活任务相关函数 =====
async function loadRevivalSettings() {
  try {
    const [settingsRes, tasksRes] = await Promise.all([
      api.get("/revival/settings"),
      api.get("/revival/tasks"),
    ]);
    revivalEnabled.value = settingsRes.data.enabled;
    presetTasks.value = tasksRes.data.presetTasks;
    customTasks.value = tasksRes.data.customTasks;
  } catch (e) {
    console.error("加载复活设置失败:", e);
  }
}

async function toggleRevival() {
  try {
    await api.put("/revival/settings", { enabled: revivalEnabled.value });
    toast.success(revivalEnabled.value ? "复活功能已开启" : "复活功能已关闭");
  } catch (e) {
    toast.error("设置失败");
    revivalEnabled.value = !revivalEnabled.value;
  }
}

async function togglePresetTask(taskId: string, enabled: boolean) {
  try {
    await api.put(`/revival/tasks/preset/${taskId}`, { enabled });
    const task = presetTasks.value.find((t) => t.id === taskId);
    if (task) task.is_enabled = enabled;
    toast.success(enabled ? "任务已启用" : "任务已禁用");
  } catch (e) {
    toast.error("设置失败");
  }
}

async function addCustomTask() {
  if (!newTaskName.value.trim()) {
    toast.warning("请输入任务名称");
    return;
  }
  try {
    const res = await api.post("/revival/tasks/custom", {
      name: newTaskName.value.trim(),
      description: newTaskDesc.value.trim() || undefined,
    });
    customTasks.value.push(res.data);
    toast.success("添加成功！");
    newTaskName.value = "";
    newTaskDesc.value = "";
  } catch (e) {
    toast.error("添加失败");
  }
}

function startEditTask(task: { id: string; name: string; description?: string }) {
  editingTask.value = task;
  editTaskName.value = task.name;
  editTaskDesc.value = task.description || "";
}

function cancelEditTask() {
  editingTask.value = null;
}

async function saveEditTask() {
  if (!editingTask.value || !editTaskName.value.trim()) return;
  try {
    await api.put(`/revival/tasks/custom/${editingTask.value.id}`, {
      name: editTaskName.value.trim(),
      description: editTaskDesc.value.trim() || undefined,
    });
    toast.success("更新成功！");
    editingTask.value = null;
    await loadRevivalSettings();
  } catch (e) {
    toast.error("更新失败");
  }
}

async function deleteCustomTask(id: string) {
  showConfirm({
    title: "删除任务",
    message: "确定删除该任务？",
    confirmText: "删除",
    type: "danger",
    onConfirm: async () => {
      try {
        await api.delete(`/revival/tasks/custom/${id}`);
        toast.success("删除成功！");
        await loadRevivalSettings();
      } catch (e) {
        toast.error("删除失败");
      }
    },
  });
}

onMounted(async () => {
  isLoading.value = true;
  try {
    await Promise.all([loadRules(), loadTags(), loadRevivalSettings()]);
    newTagColor.value =
      presetColors[Math.floor(Math.random() * presetColors.length)];
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <PageLayout>
    <div class="max-w-4xl mx-auto w-full">
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="text-6xl animate-bounce mb-4">⚙️</div>
          <div class="text-gray-500">加载中...</div>
        </div>
      </div>
      <template v-else>
        <div class="flex gap-2 mb-6">
          <button
            @click="activeTab = 'rules'"
            class="px-5 py-2.5 rounded-xl font-medium transition-all"
            :class="
              activeTab === 'rules'
                ? 'bg-white shadow-lg text-orange-600'
                : 'bg-white/50 text-gray-500 hover:bg-white/70'
            "
          >
            📋 规则管理
          </button>
          <button
            @click="activeTab = 'tags'"
            class="px-5 py-2.5 rounded-xl font-medium transition-all"
            :class="
              activeTab === 'tags'
                ? 'bg-white shadow-lg text-orange-600'
                : 'bg-white/50 text-gray-500 hover:bg-white/70'
            "
          >
            🏷️ 标签管理
          </button>
          <button
            @click="activeTab = 'revival'"
            class="px-5 py-2.5 rounded-xl font-medium transition-all"
            :class="
              activeTab === 'revival'
                ? 'bg-white shadow-lg text-orange-600'
                : 'bg-white/50 text-gray-500 hover:bg-white/70'
            "
          >
            🔄 复活任务
          </button>
        </div>

        <template v-if="activeTab === 'rules'">
          <div class="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <h3 class="font-bold text-lg mb-4">➕ 添加新规则</h3>
            <div class="flex flex-wrap gap-3 mb-4">
              <input
                v-model="newRuleName"
                type="text"
                placeholder="规则名称"
                class="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                @keyup.enter="addRule"
              />
              <select
                v-model="newRuleCategory"
                class="border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400 cursor-pointer"
              >
                <option v-for="cat in categories" :key="cat">{{ cat }}</option>
              </select>
              <input
                v-model.number="newRulePoints"
                type="number"
                placeholder="分值"
                class="w-24 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
              />
            </div>
            <div class="flex gap-3">
              <button
                @click="addRule"
                class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                添加规则
              </button>
              <button
                @click="resetRules"
                class="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-300 transition-all"
              >
                🔄 重置为默认
              </button>
            </div>
          </div>
          <div class="space-y-6" v-if="rules.length > 0">
            <template v-for="cat in categories" :key="cat">
              <div
                v-if="rulesByCategory[cat].length > 0"
                class="bg-white rounded-2xl p-6 shadow-lg"
              >
                <h3 class="font-bold text-lg mb-4">
                  {{
                    cat === "学习"
                      ? "📚"
                      : cat === "行为"
                        ? "🎯"
                        : cat === "健康"
                          ? "💪"
                          : "📌"
                  }}
                  {{ cat }}
                  <span class="text-sm font-normal text-gray-400"
                    >({{ rulesByCategory[cat].length }}条)</span
                  >
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="rule in rulesByCategory[cat]"
                    :key="rule.id"
                    class="flex items-center justify-between p-3 rounded-xl border-2 transition-all"
                    :class="
                      rule.points > 0
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    "
                  >
                    <template v-if="editingRule?.id === rule.id">
                      <div class="flex flex-wrap gap-2 flex-1">
                        <input
                          v-model="editName"
                          type="text"
                          class="flex-1 min-w-[150px] border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                          @keyup.enter="saveEditRule"
                          @keyup.escape="cancelEditRule"
                        />
                        <select
                          v-model="editCategory"
                          class="border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 cursor-pointer"
                        >
                          <option v-for="c in categories" :key="c">
                            {{ c }}
                          </option>
                        </select>
                        <input
                          v-model.number="editPoints"
                          type="number"
                          class="w-20 border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                        />
                      </div>
                      <div class="flex gap-1 ml-3">
                        <button
                          @click="saveEditRule"
                          class="text-green-600 px-3 py-1.5 font-medium text-sm bg-green-100 rounded-lg"
                        >
                          保存</button
                        ><button
                          @click="cancelEditRule"
                          class="text-gray-500 px-3 py-1.5 font-medium text-sm bg-gray-100 rounded-lg"
                        >
                          取消
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <div class="flex items-center gap-3">
                        <span
                          class="font-bold text-xl w-14 text-center"
                          :class="
                            rule.points > 0 ? 'text-green-500' : 'text-red-500'
                          "
                          >{{ rule.points > 0 ? "+" : ""
                          }}{{ rule.points }}</span
                        ><span class="font-medium text-gray-700">{{
                          rule.name
                        }}</span>
                      </div>
                      <div class="flex gap-1">
                        <button
                          @click="startEditRule(rule)"
                          class="text-blue-500 text-sm font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg"
                        >
                          编辑</button
                        ><button
                          @click="deleteRule(rule.id)"
                          class="text-red-400 text-sm font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg"
                        >
                          删除
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div
            v-if="rules.length === 0"
            class="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-lg"
          >
            <div class="text-5xl mb-4">📋</div>
            暂无规则，点击"重置为默认"加载预设规则
          </div>
        </template>

        <template v-if="activeTab === 'tags'">
          <div class="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <h3 class="font-bold text-lg mb-4">➕ 添加新标签</h3>
            <div class="flex flex-wrap gap-3 mb-4">
              <input
                v-model="newTagName"
                type="text"
                placeholder="标签名称"
                class="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                @keyup.enter="addTag"
              />
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">颜色：</span>
                <div class="flex gap-1.5">
                  <button
                    v-for="color in presetColors"
                    :key="color"
                    @click="newTagColor = color"
                    class="w-7 h-7 rounded-full transition-transform hover:scale-110"
                    :class="
                      newTagColor === color
                        ? 'ring-2 ring-offset-2 ring-gray-400'
                        : ''
                    "
                    :style="{ backgroundColor: color }"
                  />
                </div>
              </div>
            </div>
            <button
              @click="addTag"
              class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              添加标签
            </button>
          </div>
          <div
            class="bg-white rounded-2xl p-6 shadow-lg"
            v-if="tags.length > 0"
          >
            <h3 class="font-bold text-lg mb-4">已创建标签</h3>
            <div class="flex flex-wrap gap-3">
              <div v-for="tag in tags" :key="tag.id" class="relative group">
                <template v-if="editingTag?.id === tag.id">
                  <div
                    class="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border-2 border-orange-300"
                  >
                    <input
                      v-model="editTagName"
                      type="text"
                      class="border-2 border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-orange-400"
                      @keyup.enter="saveEditTag"
                      @keyup.escape="cancelEditTag"
                    />
                    <div class="flex gap-1">
                      <button
                        v-for="color in presetColors.slice(0, 6)"
                        :key="color"
                        @click="editTagColor = color"
                        class="w-5 h-5 rounded-full"
                        :class="
                          editTagColor === color
                            ? 'ring-2 ring-offset-1 ring-gray-400'
                            : ''
                        "
                        :style="{ backgroundColor: color }"
                      />
                    </div>
                    <button
                      @click="saveEditTag"
                      class="text-green-600 px-2 py-1 text-sm font-medium"
                    >
                      保存
                    </button>
                    <button
                      @click="cancelEditTag"
                      class="text-gray-500 px-2 py-1 text-sm font-medium"
                    >
                      取消
                    </button>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="px-4 py-2 rounded-full text-white font-medium flex items-center gap-2"
                    :style="{ backgroundColor: tag.color }"
                  >
                    {{ tag.name
                    }}<button
                      @click="startEditTag(tag)"
                      class="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white"
                    >
                      ✏️</button
                    ><button
                      @click="deleteTag(tag.id)"
                      class="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div
            v-if="tags.length === 0"
            class="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-lg"
          >
            <div class="text-5xl mb-4">🏷️</div>
            暂无标签，添加标签用于给学生分类标记
          </div>
        </template>

        <!-- 复活任务配置 -->
        <template v-if="activeTab === 'revival'">
          <!-- 功能开关 -->
          <div class="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-lg">🔄 复活任务功能</h3>
                <p class="text-gray-500 text-sm mt-1">
                  开启后，阵亡学生的宠物可以通过完成任务复活
                </p>
              </div>
              <button
                @click="revivalEnabled = !revivalEnabled; toggleRevival()"
                class="relative w-14 h-8 rounded-full transition-colors"
                :class="revivalEnabled ? 'bg-green-500' : 'bg-gray-300'"
              >
                <span
                  class="absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all"
                  :class="revivalEnabled ? 'left-7' : 'left-1'"
                ></span>
              </button>
            </div>
          </div>

          <template v-if="revivalEnabled">
            <!-- 系统预置任务 -->
            <div class="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <h3 class="font-bold text-lg mb-4">📋 系统预置任务</h3>
              <p class="text-gray-500 text-sm mb-4">
                勾选要启用的预置任务，分配给学生时从中选择
              </p>
              <div class="space-y-2">
                <div
                  v-for="task in presetTasks"
                  :key="task.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <label class="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      :checked="task.is_enabled"
                      @change="togglePresetTask(task.id, !task.is_enabled)"
                      class="w-5 h-5 rounded text-orange-500 focus:ring-orange-400"
                    />
                    <div>
                      <div class="font-medium text-gray-800">{{ task.name }}</div>
                      <div v-if="task.description" class="text-sm text-gray-500">
                        {{ task.description }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- 自定义任务 -->
            <div class="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <h3 class="font-bold text-lg mb-4">✏️ 自定义任务</h3>
              <div class="flex flex-wrap gap-3 mb-4">
                <input
                  v-model="newTaskName"
                  type="text"
                  placeholder="任务名称"
                  class="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                />
                <input
                  v-model="newTaskDesc"
                  type="text"
                  placeholder="任务描述（可选）"
                  class="flex-1 min-w-[200px] border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                />
                <button
                  @click="addCustomTask"
                  class="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  添加任务
                </button>
              </div>

              <div v-if="customTasks.length > 0" class="space-y-2">
                <div
                  v-for="task in customTasks"
                  :key="task.id"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <template v-if="editingTask?.id === task.id">
                    <div class="flex-1 flex gap-2">
                      <input
                        v-model="editTaskName"
                        type="text"
                        class="flex-1 border-2 border-orange-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400"
                      />
                      <input
                        v-model="editTaskDesc"
                        type="text"
                        placeholder="描述"
                        class="flex-1 border-2 border-orange-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <div class="flex gap-1 ml-3">
                      <button
                        @click="saveEditTask"
                        class="text-green-600 px-3 py-1.5 font-medium text-sm bg-green-100 rounded-lg"
                      >
                        保存
                      </button>
                      <button
                        @click="cancelEditTask"
                        class="text-gray-500 px-3 py-1.5 font-medium text-sm bg-gray-100 rounded-lg"
                      >
                        取消
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <div>
                      <div class="font-medium text-gray-800">{{ task.name }}</div>
                      <div v-if="task.description" class="text-sm text-gray-500">
                        {{ task.description }}
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button
                        @click="startEditTask(task)"
                        class="text-blue-500 text-sm font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg"
                      >
                        编辑
                      </button>
                      <button
                        @click="deleteCustomTask(task.id)"
                        class="text-red-400 text-sm font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg"
                      >
                        删除
                      </button>
                    </div>
                  </template>
                </div>
              </div>
              <div
                v-else
                class="text-center py-8 text-gray-500"
              >
                暂无自定义任务
              </div>
            </div>
          </template>
        </template>
      </template>
    </div>
    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :type="confirmDialog.type"
      @confirm="confirmDialog.onConfirm"
      @cancel="closeConfirm"
    />
  </PageLayout>
</template>
