const { projectId, mnemonics, pk } = require('./secrets.json');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*"
    },
    local: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 8000000,
    },
    ganache: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 15000000,
      // accounts: {
      //   mnemonic: "test test test test test test test test test test test junk"
      // }
    },
    ropsten: {
      provider: () => new HDWalletProvider(mnemonics, `https://ropsten.infura.io/v3/${projectId}`),
      network_id: 3,       // Ropsten's id
      gas: 7900000,        // Ropsten has a lower block limit than mainnet
      confirmations: 1,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: false
    },
    develop: {
      defaultEtherBalance: 100000,
      accounts: 20
    },
    main: {
      provider: () => new HDWalletProvider(mnemonics, `https://mainnet.infura.io/v3/${projectId}`),
      network_id: 1,       
      // gas: 12406082,       
      gasPrice: 57000000000,
      confirmations: 1,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: false
    },
    mumbai: {
      provider: () => new HDWalletProvider(pk, `https://rpc-mumbai.matic.today`),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gasPrice: 1000000000,
    },
    matic: {
      provider: () => new HDWalletProvider(pk, `https://rpc-mainnet.matic.network`),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true,
      gasPrice: 1000000000,
      networkCheckTimeout: 1000000
    },
  },
  //
  compilers: {
    solc: {
      version: "0.6.8",  // ex:  "0.4.20". (Default: Truffle's installed solc)
      settings: {
        optimizer: {
          enabled: true,
          runs: 200000
        }
      },
      evmVersion: "petersburg"
    }
  },
  plugins: [
    // 'truffle-plugin-verify',
    // 'truffle-plugin-blockscout-verify',
    // "truffle-source-verify",
    // "truffle-contract-size"
  ],
  mocha: {
    reporter: 'eth-gas-reporter',
    before_timeout: 1200000,
    reporterOptions: {
      gasPrice: 55
    }
  }
};
