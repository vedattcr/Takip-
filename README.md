# Davet Evi Takip — PWA (Production-Ready)

Bu klasör, "Davet Evi Takip" uygulamasının tam işlevsel, deploy edilebilir
bir PWA (Progressive Web App) sürümüdür. Tasarım ve tüm özellikler
(rezervasyon listesi, takvim, paket yönetimi, giderler, aylık rapor,
yedekle/içe aktar) birebir korunmuştur.

## Klasör içeriği

```
index.html          → Uygulamanın ana HTML dosyası
style.css           → Tüm görsel tasarım (marka renkleri, tipografi)
app.js              → Uygulamanın tüm mantığı (rezervasyon/paket/rapor)
manifest.json        → PWA kimliği: ad, ikonlar, renkler, standalone mod
sw.js                → Service Worker: offline çalışma ve önbellekleme
icons/               → Uygulama ikonları (192, 512, maskable, apple)
```

## 1) Yerelde test etme

Tarayıcılar `file://` üzerinden service worker'a izin vermez, bu yüzden
basit bir yerel sunucu ile açman gerekir:

```bash
cd davet-evi-takip-pwa
python3 -m http.server 8080
```

Sonra tarayıcıda `http://localhost:8080` adresini aç.

## 2) Gerçek bir adrese deploy etme (HTTPS şart)

PWA'nın telefonlara "yüklenebilir" olması ve APK'ya çevrilebilmesi için
**gerçek bir HTTPS adresinde** yayında olması gerekir. En kolay ücretsiz
seçenekler:

- **Netlify** (netlify.com) → "Deploy manually" ile bu klasörü sürükle-bırak
- **Vercel** (vercel.com) → yeni proje, klasörü yükle
- **GitHub Pages** → bu klasörü bir repoya koy, Pages'i aktif et
- **Firebase Hosting** (firebase.google.com) → `firebase deploy`

Hangisini kullanırsan kullan, sonunda elinde şöyle bir adres olacak:
`https://davet-evi-takip.netlify.app` (örnek)

## 3) Bu adresi Android APK'ya çevirme

Deploy ettikten sonra iki pratik yol var:

### A) PWABuilder (kod yazmadan, en kolay)
1. https://www.pwabuilder.com adresine git
2. Deploy ettiğin HTTPS adresini yapıştır, "Start" de
3. PWABuilder manifest.json ve service worker'ı otomatik algılar
4. "Package for Stores" → **Android** seç
5. İndirilen paket, Google Play'e yüklenebilir bir **.aab** veya kurulum
   için bir **.apk** içerir

### B) Bubblewrap (Google'ın resmi CLI aracı, daha profesyonel sonuç)
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://SENIN-ADRESIN/manifest.json
bubblewrap build
```
Bu, "Trusted Web Activity" (TWA) tabanlı gerçek bir Android projesi ve
imzalanmış bir APK üretir. Node.js ve Android SDK gerektirir; Bubblewrap
bunları ilk çalıştırmada senin için indirebilir.

**Not:** TWA/Bubblewrap ile üretilen APK, Google Play'in kalite
kriterlerini karşılar ve mağazaya yüklemeye uygundur. PWABuilder'ın
çıktısı da benzer şekilde mağazaya yüklenebilir.

## 4) Google Play'e yüklemek istersen

- Google Play Console hesabı (tek seferlik ~25$)
- `assetlinks.json` doğrulama dosyasını deploy ettiğin adrese eklemen
  gerekir (Bubblewrap veya PWABuilder bu dosyayı senin için oluşturur,
  sen sadece `.well-known/assetlinks.json` yoluna koyarsın)
- Play Console'da uygulamayı oluşturup .aab dosyasını yüklemen yeterli

## Veri hakkında önemli not

Uygulama verileri (rezervasyonlar, paketler) kullanıcının **kendi
cihazında** (localStorage) saklanır — bir sunucuya gönderilmez. Bu,
APK'ya çevrilse bile değişmez: her cihaz kendi verisini tutar, cihazlar
arası otomatik senkronizasyon yoktur. Uygulama içindeki **"Yedekle" /
"İçe Aktar"** butonları, verinin cihazlar arasında elle taşınmasını
sağlar.

Birden fazla cihazın (örneğin birden fazla çalışanın) aynı veriye eş
zamanlı erişmesi gerekiyorsa, bunun için ayrıca bir sunucu tarafı veri
katmanı (örn. Firebase, Supabase) eklenmesi gerekir — bu proje şu an
için tamamen cihaz-içi (offline-first) çalışacak şekilde tasarlanmıştır.
