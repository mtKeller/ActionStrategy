/**
 * @license
 * Copyright Micah T. Keller All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://github.com/mtKeller/Tactician
 */

import { Action } from '@ngrx/store';

declare module '@ngrx/store' {
  interface Action {
    type: string;
    strategy?: ActionStrategy;
    payload?: any;
  }
}

/**
 * END_OF_ACTION_STRATEGY
 * `type` String
 *
 * For use in NgRx Effects `ofType`
 */

export const END_OF_ACTION_STRATEGY = 'END_OF_ACTION_STRATEGY';

/**
 * EndOfActionStrategy
 * A proxy action fired at the end of a completed strategy
 *
 * @param strategy - Do not assign on creation in ActionNode, ActionStrategy reassigns as it steps.
 */

export class EndOfActionStrategy implements Action {
  readonly type = END_OF_ACTION_STRATEGY;
  constructor(public strategy: ActionStrategy) {}
}

/**
 * ActionNode
 * Control Structure used by ActionStrategy
 *
 * `NOTE` When creating Actions for action. There is no need to pass payload, or strategy parameters,
 *  as ActionStrategy takes care of that behind the scenes.
 *
 * @param action - Action to be dispatched.
 * @param successNode - Upon ActionStrategy.success() the Strategy will update itself to this node.
 * * If set to null, will default to EndOfActionStrategy on ActionStrategy.success().
 * @param failureNode - `optional` ActionStrategy.failed() will fire EndOfActionStrategy if left blank or set to null.
 * @param payload - `optional` Will carry this payload just for this node.
 */

export interface ActionNode {
  action: Action;
  successNode: ActionNode;
  failureNode?: ActionNode;
  payload?: any;
}

/**
 * ActionStrategyParams
 * Interface of ActionStrategy Construction
 *
 * @param payload - Payload to be carried throughout the strategy.
 * @param initialNode - Starting point of your ActionStrategy
 */

export interface ActionStrategyParams {
  payload: any;
  initialNode: ActionNode;
}

/**
 * ActionStrategy
 * Strategy Pattern that utilizes NgRx's Action to facilitate a verbose approach to programmatic problem solving.
 *
 * @param params - Takes an object interface of:
 * `ActionStrategyParams { payload: any; initialNode: ActionNode; }`
 *
 * @function begin() - Will return the current Action without advancing the stage.
 * @function success() - Returns the action of the current successNode and assigns itself to it's `strategy` parameter.
 * @function failed() - Returns the current failureNode or EndOfActionTree if set to null.
 */
export class ActionStrategy {
  payload: any;
  currentNode: ActionNode;
  actionList: Array<string> = [];
  lastAction: Action;
  constructor(params: ActionStrategyParams) {
    this.lastAction = params.initialNode.action;
    this.payload = params.payload;
    this.currentNode = params.initialNode;
    if (params.initialNode !== null) {
      this.actionList = ['[INITIAL ACTION]: ' + params.initialNode.action.type];
    }
  }
  /**
   * @function begin() returns the current action
   * Used to chain NgRx Effects together in a cohesive fashion.
   */
  begin(): Action {
    this.currentNode.action.strategy = this;
    if (this.currentNode.action !== null) {
      if (this.currentNode.payload) {
        this.currentNode.action.payload = this.currentNode.payload;
      }
      return this.currentNode.action;
    } else {
      return new EndOfActionStrategy(this);
    }
  }
  /**
   * success(payload?: any)
   * Returns the success stage's Action and reassigns ActionStrategy to that Action's strategy parameter.
   * * If no successNode is found, will return EndOfActionStrategy instead.
   * @param payload - OPTIONAL, if used will override the ActionStrategy's payload
   * * `NOTE` This is very useful for updating your payload via: ActS.success( { ...ActS.payload, newParam: true } )
   */
  success(payload?: any) {
    if (payload) {
      this.payload = payload;
    }
    let nextAction: Action;
    if (this.currentNode.successNode !== null) {
      nextAction = this.currentNode.successNode.action;
      this.currentNode = this.currentNode.successNode;
    } else {
      this.actionList.push('Success: ' + END_OF_ACTION_STRATEGY);
      return new EndOfActionStrategy(this);
    }
    this.actionList.push('Success: ' + nextAction.type);
    this.lastAction = nextAction;
    nextAction.strategy = this;
    if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
      nextAction.payload = this.currentNode.payload;
    }
    return nextAction;
  }
  /**
   * success(payload?: any)
   * Returns the failure stage's Action and reassigns ActionStrategy to that Action's strategy parameter.
   * If no failureNode is found, will return EndOfActionStrategy instead.
   * @param payload - OPTIONAL, if used will override the ActionStrategy's payload
   * * `NOTE` This is very useful for updating your payload via: ActS.success( { ...ActS.payload, newParam: true } )
   */
  failed(payload?: any) {
    if (payload) {
      this.payload = payload;
    }
    let nextAction: Action;
    if (this.currentNode.failureNode !== null && this.currentNode.failureNode !== undefined) {
      nextAction = this.currentNode.failureNode.action;
      this.currentNode = this.currentNode.failureNode;
      if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
        this.payload = this.currentNode.payload;
      }
    } else {
      this.actionList.push('Failed: ' + END_OF_ACTION_STRATEGY);
      return new EndOfActionStrategy(this);
    }
    this.actionList.push('Failed: ' + this.lastAction.type);
    this.lastAction = nextAction;
    nextAction.strategy = this;
    if (this.currentNode.payload !== null && this.currentNode.payload !== undefined) {
      nextAction.payload = this.currentNode.payload;
    }
    return nextAction;
  }
}
