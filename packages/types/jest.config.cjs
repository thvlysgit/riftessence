module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
}
