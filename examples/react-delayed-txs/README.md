# React Timelock Example

This is a basic example to demonstrate usage of the `@ideallabs/timelock.js` library. It can be used to get started with building applications using timelock encryption.

## Build

This application is built with `react-app rewired` to handle polyfills for crypto modules.

```shell
npm run build
```

## Run

```shell
npm run start
```

``` shell
cargo contract instantiate ./contract/vault/target/ink/vault.contract --constructor default --suri //Alice --url ws://127.0.0.1:9944 -x
```