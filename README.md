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
- `src/lib/progress.js`: ilerleme verisi ve iki cihazdaki kopyaların birleştirilmesi.
- `src/lib/cloud.js`: Firestore'a kaydetme, PIN ile giriş.
- `src/lib/storage.js`: bu tarayıcıdaki yerel kopya (hızlı açılış ve internetsiz oynama için).
- `src/components/`: ekranlar (harita, sorular, Speak Studio, My words, ayarlar).

## Bulut (Firebase)

Profiller ve ilerleme Firebase Firestore'da (proje: `word-adventure-game`, konum: europe-west3) saklanır.

- `profiles/{id}`: başlangıç ekranındaki herkese açık kart (ad, avatar, seviye, rütbe, seri).
- `progress/{anahtar}`: ilerleme. Anahtar, profil kimliği + PIN'in SHA-256 özeti; PIN hiçbir yerde saklanmaz.
- Güvenlik kuralları `firestore.rules` dosyasında. Değiştirirsen Firebase konsolunda Firestore → Rules sekmesine yapıştırıp yayınla.

Testler: `npm test`

## Yayına alma

`npm run build` komutu `dist/` klasörünü üretir. Bu klasör GitHub Pages gibi herhangi bir statik barındırma servisine yüklenebilir.
