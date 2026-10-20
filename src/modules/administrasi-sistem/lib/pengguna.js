import { labelModul, labelAksi, labelScope } from '@/config/menu'

export const AKSI_URUT = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'PROCESS', 'APPROVE', 'ASSIGN', 'PRINT', 'MANAGE']
export const SCOPE_URUT = ['sendiri', 'unit_kerja', 'seluruh']

// Mengubah unit kerja berhierarki menjadi daftar datar berurutan beserta kedalaman
// (untuk <select> bertingkat). Aman terhadap data siklus dan unit yatim.
export function ratakanUnit(units) {
  const anak = new Map()
  for (const u of units) {
    const k = u.parent_id ?? null
    if (!anak.has(k)) anak.set(k, [])
    anak.get(k).push(u)
  }
  for (const arr of anak.values()) {
    arr.sort((a, b) => (a.urutan - b.urutan) || a.nama.localeCompare(b.nama, 'id'))
  }

  const hasil = []
  const dikunjungi = new Set()
  const telusuri = (parent, depth) => {
    for (const u of anak.get(parent) ?? []) {
      if (dikunjungi.has(u.id)) continue
      dikunjungi.add(u.id)
      hasil.push({ ...u, depth })
      telusuri(u.id, depth + 1)
    }
  }
  telusuri(null, 0)

  // Unit yang induknya tidak ada di daftar tetap ditampilkan
  for (const u of units) {
    if (dikunjungi.has(u.id)) continue
    dikunjungi.add(u.id)
    hasil.push({ ...u, depth: 0 })
    telusuri(u.id, 1)
  }
  return hasil
}

// Menghitung perubahan antara kondisi awal dan draf matriks hak akses.
// awal/draft: Map(permission_id -> 'sendiri' | 'unit_kerja' | 'seluruh'); kosong = tidak ada hak.
export function hitungPerubahanMatriks(awal, draft) {
  const hapus = []
  const simpan = []
  const semua = new Set([...awal.keys(), ...draft.keys()])
  for (const id of semua) {
    const a = awal.get(id) ?? null
    const d = draft.get(id) ?? null
    if (a === d) continue
    if (d === null) hapus.push(id)
    else simpan.push({ permission_id: id, data_scope: d })
  }
  return { hapus, simpan }
}

// Menyusun daftar permission menjadi { modul -> { aksi -> id } } dan daftar modul berurutan.
export function susunMatriks(permissions) {
  const indeks = {}
  for (const p of permissions) {
    ;(indeks[p.modul] ??= {})[p.aksi] = p.id
  }
  const modul = Object.keys(indeks).sort((a, b) =>
    (labelModul[a] ?? a).localeCompare(labelModul[b] ?? b, 'id')
  )
  return { indeks, modul }
}

// Ringkasan hak efektif per modul, dikelompokkan menurut cakupan data
export function ringkasHak(daftar) {
  const peta = new Map()
  for (const p of daftar) {
    if (!peta.has(p.modul)) peta.set(p.modul, {})
    const perScope = peta.get(p.modul)
    ;(perScope[p.data_scope] ??= []).push(labelAksi[p.aksi] ?? p.aksi)
  }
  return [...peta]
    .map(([modul, perScope]) => ({
      modul,
      label: labelModul[modul] ?? modul,
      baris: SCOPE_URUT.filter((s) => perScope[s]).map((s) => ({ scope: labelScope[s], aksi: perScope[s].join(', ') })),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'))
}
