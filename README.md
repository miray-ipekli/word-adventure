# Word Adventure

İngilizce kelime ve konuşma oyunu. Her profil kendi seviyesini ve 5 konusunu (ada) seçer.

## Çalıştırma

```
npm install
npm run dev
```

Sonra tarayıcıda http://localhost:5173 adresini aç. Mikrofonlu sorular için Chrome veya Edge kullan.

## Proje yapısı

- `src/data/topics.js`: konular ve kelimeler (16 konu × 3 seviye × 6 kelime). Yeni kelime eklemek için buraya satır ekle.
- `src/lib/srs.js`: tekrar sistemi. Kelimeler 1–6 arası kutularda ilerler, yanlış cevapta 2 kutu geri düşer.
- `src/lib/speech.js`: sesli okuma ve konuşma tanıma (tarayıcının kendi özelliği).
- `src/lib/storage.js`: profiller, XP, seri (streak). Veriler tarayıcının localStorage'ında durur.
- `src/components/`: ekranlar (harita, sorular, Speak Studio, My words, ayarlar).

## Yayına alma

`npm run build` komutu `dist/` klasörünü üretir. Bu klasör GitHub Pages gibi herhangi bir statik barındırma servisine yüklenebilir.
