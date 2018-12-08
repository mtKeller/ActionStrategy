# ActionStrategy

Helpful binary strategy strategy object designed for [NgRx](ngrx.io) based [Angular](angular.io) Apps. Which extrapolates said into a patterned Data Driven Architecture
Before proceeding, be sure to be comfortable with NgRx.
Otherwise understand that what this approach accomplishes is exploitation of NgRx functional side effect handling to chain a problem solving strategy.

An ActionStrategy is a D.D.A. (Data Driven Architecture) *control structure*. Which implements strategy via ActionStrategy generative functions, or can be statically defined for normal routines. Which encompasses the binary tree pattern via chained ActionNode:

```javascript
export interface ActionNode {
    initAction: Action;
    successNode: ActionNode;
    failureNode?: ActionNode;
    payload?: any;
}
```

Thus data is the initialization action. Left and right are implemented via Success and Failure
**Importantly** payload is a override parameter to ActionStrategy's own internal payload. More below.

Final version will also implement ActionStrategy for redux-observable

First be sure to include this declaration in your app.module.ts

```javascript
declare module '@ngrx/store' {
    interface Action {
        type: string;
        strategy?: ActionStrategy;
        payload?: any;
    }
}
```

Note that with this declaration you may still create single use pure actions and single use payload actions to effect UI State.
In fact this is the main difference between default ngRx and one that utilizes ActionStrategies. Global state here is referred to as UI State, as traditionally in redux the look and function of the UI mutates around changes to the Global state. Where as an ActionStrategy may contain only side effects with no interaction with the UI functionality. Optionally you may utilize Strategic Actions to mutate UI State hook back into UI state at any time to update either UI State, or the Strategy payload.

Below is a hypothetical. First install via:

```bash
npm i actionstrategy @ngrx/store
```

Then per *feature*.actions.ts you would like to include a Strategy.

```javascript
import { ActionStrategy } from 'actionstrategy';
```

To implement a Strategic Action we must declare it's type, class definition as well as include the ActionTee object in the constructor. Note that we must set the strategy variable to both public and equal to null. This is to allow access of the strategy property. In addition ActionStrategy dynamically reassigns itself to each Strategic Action.

```javascript
export const GET_FILE = '[Http] GET_FILE';

export class GetFile implements Action {
    readonly type = GET_FILE;
    constructor(public strategy: ActionStrategy = null)
}
```

Next for development you should implement the Strategic Action: EndOfActionChain
**It's at this point that with this approach it is best practice to create a Main Feature Module**
Thus within main.effects.ts we implement...

```javascript
@Effect
    MainEndOfActionStrategy$: Observable<any> = this.actions$
            .pipe(
                ofType(END_OF_ACTION_STRATEGY),
                map(action => new MainActions.MainSuccess(action.strategy.payload)) // Handle final logs, optionally set feature loading to false
            );
```

In order to allow the strategy to cascade through your Redux features you must include a Effect per Strategic Action.
Below is an example implementation of an http link effect. Which gets the ActionStrategy's specified payload then appends data to said payload upon server response

```javascript
@Effect
    HttpGetFile$: Observable<any> = this.actions$
            .pipe(
                ofType(GET_FILE),
                switchMap(action => {
                        return this.http.get(action.strategy.payload)
                            .pipe(
                                switchMap(data => {
                                    if (data) {
                                        return action.strategy.success({
                                            ...action.strategy.payload,
                                            data: data
                                        }); // Calls the success node and appends the returned data to the ActionStrategy Encapsulated State
                                    } else {
                                        return action.strategy.failed() // Dispatches the failure ActionNode if the http service ran into an error
                                    }
                                })
                            );

                    }) //Sets loading to false if desired
            );
```

Then after creating a series of Strategic Actions to facilitate per step for the problem you are solving. Create your *feature*.strategies.ts file.
Here we will create our individual action strategy generators, you may also declare these *recursively.* Below is a very simple example of generating an ActionStrategy. Remember that ActionStrategy is a binary tree object, meaning that you must write each in ascending order due to objects declaration per assignment.

```javascript
import { ActionNode, ActionStrategy, ActionStrategyParams} from 'ActionStrategy';
import * as MainActions from '../Main/Main.actions.ts'; // For production, be sure to { } include only what you need
import * as HttpActions from '../Http/Http.actions.ts';
import * as ParserActions from '../Parser/Parser.actions.ts';

export function genActionStrategyExample(store: Store<any>, targetFile?: string) {
    //Tier 2
    const ActionNodeAddHeroList: ActionNode = { // Success
        initAction: new MainActions.AddHeroList(),
        successAction: null // End of ActionStrategy
    }
    //Tier 1
    const ActionNodeGetHeroNamesFromFile: ActionNode = { // Success
        initAction: new ParserActions.GetHeroNames(),
        successAction: ActionNodeAddHeroList
    }
    const ActionNodeAppendLogError: ActionNode = { // Failure Condition
        initAction: new HttpActions.AppendLogError(),
        successAction: null // End of ActionStrategy
    }
    // Tier 0 Get File Node
    const ActionNodeGetFile: ActionNode = {
        initAction: new HttpActions.GetFileFromServer(),
        successAction: new ParserActions.getHeroNames(), // Extracts hero names from the txt file
        failureAction: ActionNodeAppendLogError // Appends the error response then logs to console
    }
    const ActionParam: ActionParams = {
        payload: targetFile || 'something.txt',
        actionNode: ActionNodeGetFile,
        store: store
    }
    const ActionStrategyExample: ActionStrategy = new ActionStrategy(ActionParam);
    return ActionStrategyExample;
}
```

## Ultimately

What this approach seeks to accomplish is to establish a genuine Data Driven Architecture that is maintainable and encapsulated from the main state via the internal handling of **ActionStrategyExample.payload** in NgRx.
The goal of each implementation should be a verbose declaration of steps needed to solve a problem. In the example we have hypothesized we created this sentence:

```javascript
// Retrieve a text file from the server; if we encounter an error send to our log service; otherwise parse out the hero names in the file; finally, then finally add it to the UI.
```

The power of NgRx Effects in combination with ActionStrategy, is that the implementation of per problem is obfuscated. As long as each strategic action returns the next, **what matters is the steps to solving the larger goal.** Where the implementation is handled does not matter, this approach merely encapsulates NodeJS's advantage in the i/o in comparison to other platforms.

## Testing

Although this is v0.5.1 the ActionStrategy Object itself is solid.
And do it it's generative nature the best means I have found to test it is to log each ActionStrategy object to console and dig into it's parameters. Mainly: actionList which is an array of steps taking.

If you find this and understand why it was made. Have fun. ;) If you have any questions, or comments please find my contact information on my site [rellek.io](rellek.io)