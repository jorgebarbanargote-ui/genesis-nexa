// Conversor a WebP con ImageIO (macOS 11+), sin dependencias externas.
// Uso: swift webp.swift entrada.jpg salida.webp [calidad 0-100]
import Foundation
import ImageIO

let a = CommandLine.arguments
guard a.count >= 3 else { print("uso: swift webp.swift <entrada> <salida.webp> [calidad 0-100]"); exit(1) }
let inURL = URL(fileURLWithPath: a[1])
let outURL = URL(fileURLWithPath: a[2])
let q = a.count > 3 ? (Double(a[3]) ?? 80) / 100.0 : 0.8

guard let src = CGImageSourceCreateWithURL(inURL as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
    print("ERROR: no pude leer \(a[1])"); exit(2)
}
guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, "org.webmproject.webp" as CFString, 1, nil) else {
    print("ERROR: este macOS no soporta escribir WebP"); exit(3)
}
CGImageDestinationAddImage(dest, img, [kCGImageDestinationLossyCompressionQuality: q] as CFDictionary)
guard CGImageDestinationFinalize(dest) else { print("ERROR: finalize falló"); exit(4) }
