const includeEmbeddedAiModels = process.env.MC_INCLUDE_AI_MODELS === '1';
const ortPlatformName = String(process.env.MC_ORT_PLATFORM || '').trim();

const extraResources = [
  {
    from: 'public/',
    to: 'public',
    filter: ['**/*'],
  },
  {
    from: 'keys/',
    to: 'keys',
    filter: ['license-public.pem'],
  },
  {
    from: 'assets/ocr/',
    to: 'ocr',
    filter: ['**/*'],
  },
];

if (includeEmbeddedAiModels) {
  extraResources.push({
    from: 'assets/ai/',
    to: 'ai',
    filter: ['**/*'],
  });
}

const files = [
  'main.js',
  'preload.js',
  'src/**/*',
  'package.json',
  '!public{,/**/*}',
  '!**/*.map',
  '!**/__tests__{,/**/*}',
  '!**/test{,s}{,/**/*}',
  '!**/docs{,/**/*}',
  '!**/example{,s}{,/**/*}',
];

if (ortPlatformName) {
  files.push(`!node_modules/onnxruntime-node/bin/napi-v3/!(${ortPlatformName}){,/**/*}`);
  files.push(`!node_modules/onnxruntime-node/bin/napi-v3/${ortPlatformName}/!(${'${arch}'}){,/**/*}`);
}

module.exports = {
  appId: 'com.messagecounter.app',
  productName: '古典小说阅读器',
  compression: 'maximum',
  asar: true,
  directories: {
    output: 'dist',
  },
  files,
  extraResources,
  mac: {
    target: ['dmg', 'zip'],
    icon: 'public/icon.icns',
    identity: null,
    extendInfo: {
      NSMicrophoneUsageDescription: '语音录入需要使用麦克风，把语音转成文字消息。',
      NSSpeechRecognitionUsageDescription: '语音录入需要语音识别权限，把说话内容转成文字消息。',
    },
  },
  win: {
    target: ['nsis'],
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  publish: [
    {
      provider: 'github',
      releaseType: 'release',
    },
  ],
};
