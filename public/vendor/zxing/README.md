# ZXing library (vendored)

`zxing-library-0.23.0.min.js` is the unmodified UMD build `umd/index.min.js` from the npm package
`@zxing/library` 0.23.0 (Apache-2.0, see LICENSE), the same version Heritage Coach pins.
sha256 3ede94153fb0c5b67a12d7adff6decd827c2b22714fdc6faecf27a8f20937ea6.

Used only by `/estimate/` to read VIN barcodes on phones without the built-in BarcodeDetector
(iPhone Safari). It is loaded on demand when the customer opens the scanner. Added with Clay's
approval, 2026-09-29.
