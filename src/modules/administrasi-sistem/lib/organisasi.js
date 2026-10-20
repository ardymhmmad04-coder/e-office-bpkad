// Id semua turunan sebuah unit (tidak termasuk dirinya). Aman terhadap data siklus.
export function idTurunan(units, id) {
  const anak = new Map()
  for (const u of units) {
    const k = u.parent_id ?? null
    if (!anak.has(k)) anak.set(k, [])
    anak.get(k).push(u.id)
  }
  const hasil = new Set()
  const tumpukan = [...(anak.get(id) ?? [])]
  while (tumpukan.length) {
    const x = tumpukan.pop()
    if (hasil.has(x)) continue
    hasil.add(x)
    tumpukan.push(...(anak.get(x) ?? []))
  }
  hasil.delete(id)
  return hasil
}

// Menggeser unit satu langkah ("naik"/"turun") di antara saudaranya.
// Mengembalikan daftar { id, urutan } yang nilainya berubah (urutan dinormalkan 0..n-1).
export function geserUrutan(units, id, arah) {
  const unit = units.find((u) => u.id === id)
  if (!unit) return []
  const saudara = units
    .filter((u) => (u.parent_id ?? null) === (unit.parent_id ?? null))
    .sort((a, b) => (a.urutan - b.urutan) || a.nama.localeCompare(b.nama, 'id'))
  const i = saudara.findIndex((u) => u.id === id)
  const j = i + (arah === 'naik' ? -1 : 1)
  if (j < 0 || j >= saudara.length) return []
  const baru = [...saudara]
  ;[baru[i], baru[j]] = [baru[j], baru[i]]
  return baru
    .map((u, idx) => ({ id: u.id, urutan: idx }))
    .filter((x) => units.find((u) => u.id === x.id).urutan !== x.urutan)
}

// Jumlah saudara (unit dengan induk yang sama), dipakai untuk urutan default unit baru
export function jumlahSaudara(units, parentId) {
  return units.filter((u) => (u.parent_id ?? null) === (parentId ?? null)).length
}
