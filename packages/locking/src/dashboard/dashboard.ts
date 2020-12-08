import { autoinject, singleton } from "aurelia-framework";
import { ContractNames } from "services/ContractsService";
import { ContractsService } from "services/ContractsService";
import "./dashboard.scss";
import { EventAggregator } from "aurelia-event-aggregator";
import TransactionsService from "services/TransactionsService";
import { Address, EthereumService } from "services/EthereumService";
import { BigNumber } from "ethers";
import { EventConfigException} from "services/GeneralEvents";
import { Router } from "aurelia-router";
import { NumberService } from "services/numberService";

@singleton(false)
@autoinject
export class Dashboard {
  private initialized = false;
  private connected = false;
  private primeToken: any;
  private lockingToken4Reputation: any;
  private primeTokenAddress: Address;
  private userPrimeBalance: BigNumber;

  constructor(
    private eventAggregator: EventAggregator,
    private contractsService: ContractsService,
    private ethereumService: EthereumService,
    private transactionsService: TransactionsService,
    private numberService: NumberService,
    private router: Router) {
  }

  private async attached(): Promise<void> {
    this.eventAggregator.subscribe("Network.Changed.Account", async () => {
      await this.loadContracts();
      this.getUserBalances();
    });
    this.eventAggregator.subscribe("Network.Changed.Disconnect", async () => {
      // TODO: undefine the bound variables
      this.initialized = false;
    });

    await this.loadContracts();
    await this.initialize();
    return this.getUserBalances(true);
  }

  /**
   * have to call this with and without an account
   */
  private async loadContracts() {
    this.primeToken = await this.contractsService.getContractFor(ContractNames.PRIMETOKEN);
    this.lockingToken4Reputation = await this.contractsService.getContractFor(ContractNames.LockingToken4Reputation);
  }

  private async initialize(): Promise<void> {
    if (!this.initialized) {
      try {
      // timeout to allow styles to load on startup to modalscreen sizes correctly
        // setTimeout(() => this.eventAggregator.publish("dashboard.loading", true), 100);
        this.primeTokenAddress = this.contractsService.getContractAddress(ContractNames.PRIMETOKEN);

      } catch (ex) {
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        this.eventAggregator.publish("dashboard.loading", false);
        this.initialized = true;
      }
    }
  }

  private async getUserBalances(initializing = false): Promise<void> {

    if (this.initialized && this.ethereumService.defaultAccountAddress) {
      try {
        if (!initializing) {
        // timeout to allow styles to load on startup to modalscreen sizes correctly
          setTimeout(() => this.eventAggregator.publish("dashboard.loading", true), 100);
        }
        this.userPrimeBalance = await this.primeToken.balanceOf(this.ethereumService.defaultAccountAddress);
        this.connected= true;
      } catch (ex) {
        this.connected = false;
        this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an error occurred", ex));
      }
      finally {
        if (!initializing) {
          this.eventAggregator.publish("dashboard.loading", false);
        }
      }
    } else {
      this.userPrimeBalance = undefined;
      this.connected = false;
    }
  }

  private ensureConnected(): boolean {
    if (!this.connected) {
      // TODO: make this await until we're either connected or not?
      this.ethereumService.connect();
      return false;
    }
    else {
      return true;
    }
  }
}
