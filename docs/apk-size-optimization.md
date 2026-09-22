# Размер Android APK

В `app.json` у плагина `expo-build-properties` включён
`android.useLegacyPackaging: true`. При `expo prebuild` это записывает
`expo.useLegacyPackaging=true` в генерируемый `android/gradle.properties`.
Настройка сохраняется после `prebuild --clean` и применяется к локальным и EAS-сборкам.

Нативные библиотеки `.so` сжимаются внутри APK без изменения их содержимого.
Android распаковывает библиотеки нужной архитектуры при установке
(`android:extractNativeLibs=true`). Поэтому размер скачиваемого APK и занимаемое
приложением место после установки — разные величины; установка включает распаковку.
Это штатная настройка [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/build-properties/#uselegacypackaging).

Сохраняются четыре архитектуры: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`.
JS-бандл остаётся несжатым, Hermes и New Architecture включены как прежде.
Версии зависимостей, патчи фонового мониторинга и `buildFromSource` не менялись.

## Локальная проверка 2026-09-22

Две успешные release-сборки из одной версии исходников (база `c889f57`),
с `NODE_ENV=production`, без `APP_VARIANT=development` и без ограничения архитектур:

| APK | Размер, байт | Размер, МиБ |
| --- | ---: | ---: |
| До сжатия | 114 092 751 | 108,81 |
| После сжатия | 57 489 343 | 54,83 |
| Экономия | 56 603 408 | 53,98 (49,61%) |

Проверено:

- В обоих APK по 1408 файлов; добавленных и удалённых файлов нет.
- SHA-256 распакованного содержимого совпадает у 1406 файлов, включая все
  92 `.so`, четыре DEX-файла, JS-бандл, 1029 ресурсов и `resources.arsc`.
- Единственные отличия содержимого: флаг `extractNativeLibs` в манифесте
  и запись `useLegacyPackaging` в `assets/app.config`. Остальные поля совпадают.
- `aapt dump badging` совпадает полностью: идентификатор приложения, версии,
  SDK, разрешения и архитектуры сохранены. Объявления компонентов в манифесте сохранены.
- Обе подписи проверены `apksigner verify`; сертификат подписи совпадает.
  Локальная конфигурация использует существующий debug-сертификат для release APK.
- `zipalign -c -P 16 -v 4` для оптимизированного APK завершился успешно.
- Все 44 Node-теста, `npm run typecheck`, `npm run lint` прошли.

APK и подробные журналы этого сравнения лежат локально в `.expo/apk-size/`
(`baseline.apk`, `optimized.apk`, `comparison.json`, журналы сборок и проверок).
Эта папка исключена из Git; итоговая сборка также находится в
`android/app/build/outputs/apk/release/app-release.apk`.

Подключённого Android-устройства на момент проверки не было. Запуск приложения,
работа экранов и фоновая задача на устройстве в этой проверке не выполнялись.
Побайтовое сравнение подтверждает сохранность кода и ресурсов, но не заменяет
проверку установки и запуска на устройстве.

## Повторная сборка

```powershell
$env:NODE_ENV = 'production'
$env:APP_VARIANT = ''
npx expo prebuild --platform android --no-install
Push-Location android
./gradlew.bat :app:assembleRelease --console=plain --max-workers=2
Pop-Location
```

Для сравнительной сборки без сжатия можно временно передать Gradle
`-Pexpo.useLegacyPackaging=false`, сохранить APK в другой файл, затем повторить
сборку с `-Pexpo.useLegacyPackaging=true`. Исходники и архитектуры должны совпадать.
Проверки на телефоне описаны в `background-monitor-device-test.md`.
