(() => {
  type CryptoWithMutableRandomUUID = Crypto & {
    randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
  };

  const g = globalThis as typeof globalThis & { crypto?: CryptoWithMutableRandomUUID };
  const cryptoObj = g.crypto;

  if (typeof cryptoObj?.randomUUID === "function") {
    return;
  }

  const fillRandomValues = (arr: Uint8Array) => {
    if (typeof cryptoObj?.getRandomValues === "function") {
      cryptoObj.getRandomValues(arr);
      return arr;
    }

    // Fallback for older/insecure mobile browsers.
    for (let i = 0; i < arr.length; i += 1) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };

  const randomUUID = () => {
    const bytes = fillRandomValues(new Uint8Array(16));

    // RFC 4122 v4 bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return (
      hex.slice(0, 8) +
      "-" +
      hex.slice(8, 12) +
      "-" +
      hex.slice(12, 16) +
      "-" +
      hex.slice(16, 20) +
      "-" +
      hex.slice(20)
    );
  };

  if (cryptoObj && typeof cryptoObj === "object") {
    try {
      cryptoObj.randomUUID = randomUUID;
      return;
    } catch {
      try {
        Object.defineProperty(cryptoObj, "randomUUID", {
          value: randomUUID,
          configurable: true,
        });
        return;
      } catch {
        // Continue to full replacement fallback below.
      }
    }
  }

  const replacementCrypto = {
    getRandomValues: fillRandomValues,
    randomUUID,
  };

  try {
    Object.defineProperty(g, "crypto", {
      value: replacementCrypto,
      configurable: true,
    });
  } catch {
    g.crypto = replacementCrypto;
  }
})();
