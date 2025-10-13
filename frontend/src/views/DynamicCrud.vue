<template>
  <div>
    <h2>{{ schema?.title || resource }}</h2>

    <div style="margin:8px 0;">
      <input v-model="q" placeholder="Search" @keyup.enter="fetchList" />
      <button @click="openCreate">New</button>
      <button @click="fetchList" style="margin-left:8px">Refresh</button>
    </div>

    <table border="1" cellpadding="8" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th v-for="col in schema?.list_display || []" :key="col">{{ col }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in items" :key="row.id">
          <td v-for="col in schema?.list_display" :key="col">{{ row[col] }}</td>
          <td>
            <button @click="openEdit(row)">Edit</button>
            <button @click="del(row.id)">Delete</button>
          </td>
        </tr>
        <tr v-if="items.length === 0">
          <td :colspan="(schema?.list_display?.length || 1) + 1">No results</td>
        </tr>
      </tbody>
    </table>

    <div v-if="showForm" class="modal">
      <div class="modal-content">
        <h3>{{ editRow ? 'Edit' : 'Create' }}</h3>
        <form @submit.prevent="submitForm">
          <div v-for="field in schema.fields" :key="field.name" style="margin-bottom:8px">
            <label>{{ field.label || field.name }}</label><br />
            <input v-if="['string','integer','decimal'].includes(field.type)"
                   :type="field.type === 'integer' || field.type === 'decimal' ? 'number' : 'text'"
                   v-model="form[field.name]"
                   :disabled="field.read_only" />
            <select v-else-if="field.type === 'choice'" v-model="form[field.name]">
              <option value="">Select</option>
              <option v-for="opt in field.choices" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <textarea v-else-if="field.type === 'text'" v-model="form[field.name]"></textarea>
            <input v-else-if="field.type === 'boolean'" type="checkbox" v-model="form[field.name]" />
          </div>

          <div style="margin-top:12px">
            <button type="submit">Save</button>
            <button type="button" @click="closeForm">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api/axios'

const resource = 'cosmetix'
const schema = ref(null)
const items = ref([])
const q = ref('')
const showForm = ref(false)
const editRow = ref(null)
const form = reactive({})

function initFormDefaults() {
  if (!schema.value) return
  schema.value.fields.forEach(f => {
    form[f.name] = f.read_only ? null : (f.default ?? '')
  })
}

async function fetchSchema() {
  try {
    const r = await api.get(`/meta/schema/${resource}/`)
    schema.value = r.data
    initFormDefaults()
  } catch (e) {
    // fallback sample schema for demo if endpoint missing
    schema.value = {
      resource: 'cosmetix',
      title: 'Cosmetix Product',
      fields: [
        { name: 'id', type: 'integer', label: 'ID', read_only: true },
        { name: 'name', type: 'string', label: 'Name', required: true },
        { name: 'brand', type: 'string', label: 'Brand' },
        { name: 'category', type: 'choice', label: 'Category', choices: ['skincare','makeup','hair'] },
        { name: 'price', type: 'decimal', label: 'Price' },
        { name: 'in_stock', type: 'boolean', label: 'In Stock' },
        { name: 'description', type: 'text', label: 'Description' }
      ],
      list_display: ['id','name','brand','category','price']
    }
    initFormDefaults()
  }
}

async function fetchList() {
  try {
    const r = await api.get(`/${resource}/`, { params: { search: q.value }})
    items.value = r.data.results || r.data
  } catch (e) {
    // fallback demo rows if backend list missing
    items.value = [
      { id: 1, name: 'Glow Serum', brand: 'Aroma', category: 'skincare', price: 1999, in_stock: true },
      { id: 2, name: 'Velvet Lip', brand: 'Chroma', category: 'makeup', price: 899, in_stock: false }
    ]
  }
}

function openCreate() {
  editRow.value = null
  schema.value.fields.forEach(f => form[f.name] = f.read_only ? null : (f.default ?? ''))
  showForm.value = true
}

function openEdit(row) {
  editRow.value = row
  schema.value.fields.forEach(f => form[f.name] = row[f.name] ?? (f.default ?? ''))
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

async function submitForm() {
  try {
    if (editRow.value) {
      await api.put(`/${resource}/${editRow.value.id}/`, form)
    } else {
      await api.post(`/${resource}/`, form)
    }
    await fetchList()
    closeForm()
  } catch (e) {
    alert('Save failed (demo). Check backend endpoints or use demo data.')
  }
}

async function del(id) {
  if (!confirm('Delete?')) return
  try {
    await api.delete(`/${resource}/${id}/`)
    await fetchList()
  } catch (e) {
    // remove from local demo list
    items.value = items.value.filter(it => it.id !== id)
  }
}

onMounted(async () => {
  await fetchSchema()
  await fetchList()
})
</script>

<style>
.modal { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.4);}
.modal-content { background:white; padding:16px; border-radius:6px; width:640px; max-width:95%; }
</style>
