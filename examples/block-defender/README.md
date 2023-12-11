# BlockDefender

## Deploying contracts

``` sh
cargo contract upload clock/mine-clock/target/ink/mine_event_clock.wasm --suri //Alice --url ws://127.0.0.1:9944 -x
# then get the output and plug it in here
cargo contract instantiate ./target/ink/block_defender.wasm --constructor new --args 25 25 100 0x6cca45f120c762ee69d9f20fb11cec032553af29955417013ebeaca5bb3cadd0 10000000 --suri //Alice --url ws://127.0.0.1:9944 -x
```



5DPC5mcUvi3wi1g9JR2HtiLZ5idThydNYzShWMajunT5yyby