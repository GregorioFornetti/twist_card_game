module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true, tsconfig: { module: 'commonjs', target: 'es2020' } }] }
};
