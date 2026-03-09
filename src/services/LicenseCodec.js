const zlib = require('zlib');

const LICENSE_CODE_PREFIX = 'MC1';
const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const BASE32_LOOKUP = (() => {
  const lookup = Object.create(null);
  for (let index = 0; index < BASE32_ALPHABET.length; index += 1) {
    lookup[BASE32_ALPHABET[index]] = index;
  }
  // Allow common manual input ambiguities.
  lookup.O = lookup[0];
  lookup.I = lookup[1];
  lookup.L = lookup[1];
  return lookup;
})();

function normalizeLicenseCode(rawCode) {
  return String(rawCode || '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
    .trim();
}

function encodeBufferToBase32(buffer) {
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of source) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32ToBuffer(encoded) {
  const source = normalizeLicenseCode(encoded);
  if (!source) {
    return Buffer.alloc(0);
  }

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const ch of source) {
    const digit = BASE32_LOOKUP[ch];
    if (!Number.isInteger(digit)) {
      throw new Error(`授权码包含无效字符: ${ch}`);
    }
    value = (value << 5) | digit;
    bits += 5;
    while (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function groupEncodedText(encoded, groupSize = 4) {
  const size = Number.isInteger(groupSize) && groupSize > 0 ? groupSize : 4;
  const normalized = String(encoded || '').trim();
  if (!normalized) return '';
  const chunks = [];
  for (let index = 0; index < normalized.length; index += size) {
    chunks.push(normalized.slice(index, index + size));
  }
  return chunks.join('-');
}

function encodeLicenseCodeFromString(licenseText, options = {}) {
  const plainText = String(licenseText || '').trim();
  if (!plainText) {
    throw new Error('授权内容不能为空');
  }
  const compressed = zlib.deflateRawSync(Buffer.from(plainText, 'utf8'));
  const encoded = encodeBufferToBase32(compressed);
  return `${LICENSE_CODE_PREFIX}-${groupEncodedText(encoded, options.groupSize)}`;
}

function decodeLicenseCodeToString(licenseCode) {
  const normalized = normalizeLicenseCode(licenseCode);
  if (!normalized) {
    throw new Error('授权码不能为空');
  }
  if (!normalized.startsWith(LICENSE_CODE_PREFIX)) {
    throw new Error('授权码前缀无效');
  }
  const encodedBody = normalized.slice(LICENSE_CODE_PREFIX.length);
  if (!encodedBody) {
    throw new Error('授权码内容为空');
  }

  let inflated;
  try {
    const compressed = decodeBase32ToBuffer(encodedBody);
    inflated = zlib.inflateRawSync(compressed);
  } catch (error) {
    throw new Error(`授权码解码失败: ${error.message}`);
  }

  return inflated.toString('utf8');
}

function normalizeLicenseInputToString(rawInput) {
  const text = String(rawInput || '').trim();
  if (!text) {
    throw new Error('请输入授权码或授权内容');
  }
  if (/^\s*\{/.test(text)) {
    return text;
  }
  if (normalizeLicenseCode(text).startsWith(LICENSE_CODE_PREFIX)) {
    return decodeLicenseCodeToString(text);
  }
  return text;
}

module.exports = {
  LICENSE_CODE_PREFIX,
  normalizeLicenseCode,
  encodeLicenseCodeFromString,
  decodeLicenseCodeToString,
  normalizeLicenseInputToString,
};
