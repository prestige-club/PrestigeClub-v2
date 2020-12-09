const { projectId, mnemonics } = require('./secrets.json');
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
      gas: 8721975,
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
    }
  },
  //
  compilers: {
    solc: {
      version: "0.6.8",  // ex:  "0.4.20". (Default: Truffle's installed solc)
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "petersburg"
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  mocha: {
    reporter: 'eth-gas-reporter'
  }
};
