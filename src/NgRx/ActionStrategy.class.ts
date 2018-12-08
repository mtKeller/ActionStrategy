import { Action, Store } from '@ngrx/store';

declare module '@ngrx/store' {
  interface Action {
    type: string;
    strategy?: ActionStrategy;
    payload?: any;
  }
}

export const END_OF_ACTION_STRATEGY = 'END_OF_ACTION_TREE';

export class EndOfActionStrategy implements Action {
  readonly type = END_OF_ACTION_STRATEGY;
  constructor(public tree: ActionStrategy) {}
}

export interface ActionNode {
  initAction: Action;
  successNode: ActionNode;
  failureNode?: ActionNode;
  payload?: any;
}

export interface ActionStrategyParams {
  payload: any;
  actionNode: ActionNode;
  store: Store<any>;
}

export class ActionStrategy {
  payload: any;
  currentNode: ActionNode;
  actionList: Array<string> = [];
  store: Store<any>;
  lastAction: Action;
  constructor(params: ActionStrategyParams) {
    this.lastAction = params.actionNode.initAction;
    this.payload = params.payload;
    this.currentNode = params.actionNode;
    if (params.actionNode !== null) {
      this.actionList = ['[INIT]: ' + params.actionNode.initAction.type];
    }
    this.store = params.store;
  }
  begin(): Action {
    this.currentNode.initAction.strategy = this;
    if (this.currentNode.initAction !== null) {
      if (this.currentNode.payload) {
        this.currentNode.initAction.payload = this.currentNode.payload;
      }
      return this.currentNode.initAction;
    } else {
      return new EndOfActionStrategy(this);
    }
  }
  init() {
    this.currentNode.initAction.strategy = this;
    if (this.currentNode.initAction !== null) {
      if (this.currentNode.payload) {
        this.currentNode.initAction.payload = this.currentNode.payload;
      }
      this.store.dispatch(this.currentNode.initAction);
    } else {
      this.store.dispatch(new EndOfActionStrategy(this));
    }
  }
  success(payload?: any) {
    if (payload) {
      this.payload = payload;
    }
    let nextNode: Action;
    if (this.currentNode.successNode !== null) {
      nextNode = this.currentNode.successNode.initAction;
      this.currentNode = this.currentNode.successNode;
      // if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
      //     this.payload = this.currentNode.payload;
      // }
    } else {
      this.actionList.push('Success: ' + END_OF_ACTION_STRATEGY);
      return new EndOfActionStrategy(this);
    }
    this.actionList.push('Success: ' + nextNode.type);
    this.lastAction = nextNode;
    nextNode.strategy = this;
    if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
      nextNode.payload = this.currentNode.payload;
    }
    return nextNode;
  }
  failed(payload?: any) {
    if (payload) {
      this.payload = payload;
    }
    let nextNode: Action;
    if (this.currentNode.failureNode !== null && this.currentNode.failureNode !== undefined) {
      nextNode = this.currentNode.failureNode.initAction;
      this.currentNode = this.currentNode.failureNode;
      if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
        this.payload = this.currentNode.payload;
      }
    } else {
      this.actionList.push('Failed: ' + END_OF_ACTION_STRATEGY);
      return new EndOfActionStrategy(this);
    }
    this.actionList.push('Failed: ' + this.lastAction.type);
    this.lastAction = nextNode;
    nextNode.strategy = this;
    if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
      nextNode.payload = this.currentNode.payload;
    }
    return nextNode;
  }
}
