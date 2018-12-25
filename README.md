# ActionStrategy

A patterned binary tree strategy object designed for [NgRx](ngrx.io) based [Angular](angular.io) Apps. Which extrapolates said into a proper Data Driven Architecture.
Before proceeding, be sure to be comfortable with NgRx and rxJs.
Otherwise understand that what this approach accomplishes is exploitation of NgRx functional side effect handling, in order to chain a problem solving strategy nodes that maintain a encapsulated set of data.

An ActionStrategy is a D.D.A. (Data Driven Architecture) *control structure*. Which implements strategy via ActionStrategy generative functions, or can be statically defined for normal routines. Which encompasses the binary tree pattern via chaining ActionNodes.

This approach can easily create memory races in JS, therefore we suggest the use of [DynamicEntity](https://www.npmjs.com/package/dynamicentity) in conjunction with this project. DynamicEntity allows for the concept of borrowing slices of state which fits into the no side effect paradigm of Function Programing in regards to reducers. In addition keep in mind the use of stacks and ques to handle logic. Just be sure to add:

```javascript
this.store.pipe(
    select(sliceOfState)
).subscribe((val) => {
    if (val !== undefined) {
        this.prop = val;
    }
})
```

To avoid breaking the UI when borrowing slices of state.

## UPDATES

v0.7.5

* Removed init(), and therefore the need to pass the store reference. This helps keep ActionStrategy Functional and reduce side effects.

v0.7.3

* Created typescript tool tips.

* Improved internal naming conventions and documentation consistency.

## Breakdown

**NOTE** When creating Actions for ActionNode, there is no need to pass payload or strategy parameters. As ActionStrategy takes care of linking behind the scenes.

```javascript
export interface ActionNode {
    action: Action;
    successNode: ActionNode;
    failureNode?: ActionNode;
    payload?: any;
}
```

The above is representative of a binary tree node. Data is equivalent the assigned action. Left and right are implemented via Success and Failure.
**Please note that each ActionNode's payload** is an override parameter to each overall ActionStrategy's own internal payload. More below.

### Set Up

Below is a hypothetical. First install via:

```bash
npm i actionstrategy @ngrx/store @ngrx/effects --save
```

To allow for proper typing be sure to include this declaration in your app.module.ts

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
In fact this is the main difference between default NgRx and ActionStrategies. Global state here is referred to as UI State, as traditionally in redux the look and functionality of the UI mutates around changes to the Global state. Where as a specific ActionStrategy may contain only side effects with no interaction with the UI functionality. Optionally you may utilize Strategic Actions to mutate the UI State by hooking back into the UI reducer at any time. *The reducer in this approach does not have to include a case for each Strategic Action.*

Then per __feature__.actions.ts that will incorporate a strategic actions.

```javascript
import { ActionStrategy } from 'actionstrategy';
```

#### Strategic Action Definition

Just like in NgRx's Action we must declare it's type, class implementation, but also include the ActionStrategy object in the constructor as a parameter. Note that we must set the strategy variable to both public and equal to null. This is to allow access of the strategy property. As internally ActionStrategy dynamically reassigns itself to each Strategic Action per Success() and Failed() calls.

```javascript
export const GET_FILE = '[Http] GET_FILE';

export class GetFile implements Action {
    readonly type = GET_FILE;
    constructor(public strategy?: ActionStrategy = null) // STRATEGY MUST BE OPTIONAL
}
```

In addition per step you may also include an explicit payload along with the strategy object to be processed at the time of the Action's side effect.

#### Strategic Effects

In order to allow the strategy to jump through your Redux features you must include a Effect per Strategic Action.
As an example of a basic strategic effect. We will implement the included Strategic Action: EndOfActionStrategy
**It's at this point that with this approach it is best practice to create a Main Feature Module**
Thus within main.effects.ts we implement...

```javascript
import { END_OF_ACTION_STRATEGY } from 'actionstrategy';

// ...

@Effect
    MainEndOfActionStrategy$: Observable<any> = this.actions$
            .pipe(
                ofType(END_OF_ACTION_STRATEGY),
                map(action => new MainActions.MainSuccess(action.strategy.payload)) // Handle final logs, optionally set feature loading to false
            );
// ...
```

Below is an example implementation of an http get request strategic effect. Which passes the Action's Strategy's payload to the angular httpclient. On completion, it dispatches the ActionStrategy's next ActionNode conditionally, if success it appends the returned data to the Strategy's payload. Otherwise it exits.

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
                                        }); // Returns the success action and appends the returned data to the ActionStrategy Encapsulated Payload
                                    } else {
                                        return action.strategy.failed() // Dispatches the failure ActionNode action if the http service ran into an error
                                    }
                                })
                            );

                    }) //Sets loading to false if desired
            );
```

#### ActionStrategy Declaration

Then after creating a series of Strategic Actions to facilitate each step for the problem you are solving. Create your __feature__.strategies.ts file.
Here we will create our individual action strategy generators, you may also declare branches __recursively.__ Below is a very simple example of generating a ActionStrategy. Remember that ActionStrategy is a binary tree object, meaning that you must write each in ascending order due to objects declaration per assignment.

```javascript
import { ActionNode, ActionStrategy, ActionStrategyParams} from 'ActionStrategy';
import * as MainActions from '../Main/Main.actions.ts'; // For production, be sure to { } include only what you need
import * as HttpActions from '../Http/Http.actions.ts';
import * as ParserActions from '../Parser/Parser.actions.ts';

export function genActionStrategyExample(targetFile?: string) {
    //Tier 2
    const ActionNodeAddHeroList: ActionNode = { // Success
        action: new MainActions.AddHeroList(),
        successNode: null // End of ActionStrategy
    }
    //Tier 1
    const ActionNodeGetHeroNamesFromFile: ActionNode = { // Success
        action: new ParserActions.GetHeroNames(),
        successNode: ActionNodeAddHeroList
    }
    const ActionNodeAppendLogError: ActionNode = { // Failure Condition
        action: new HttpActions.AppendLogError(),
        successNode: null // End of ActionStrategy
    }
    // Tier 0 Get File Node
    const ActionNodeGetFile: ActionNode = {
        action: new HttpActions.GetFileFromServer(),
        successNode: new ParserActions.getHeroNames(), // Extracts hero names from the txt file
        failureNode: ActionNodeAppendLogError // Appends the error response then logs to console
    }
    const ActionParam: ActionParams = {
        payload: targetFile || 'something.txt',
        initialNode: ActionNodeGetFile,
    }
    const ActionStrategyExample: ActionStrategy = new ActionStrategy(ActionParam);
    return ActionStrategyExample;
}
```

### Initialization

#### begin()

This will return the current action in you ActionStrategy tree. Rather than the success or failure actions. Use case in Store dispatch and Effects:

```javascript
this.store.dispatch(ExampleActionStrategy.begin()); // versus this.store.dispatch(new ActionEx())

//or internally in the effects it can be used to switch active strategies
@Effect
    MainExampleStrategy$: Observable<any> = this.actions$
            .pipe(
                ofType(EXAMPLE_STRATEGY),
                map(action => {
                    const NewActionStrategy: ActionStrategy = generateExampleStrategy(this.store);
                    return NewActionStrategy.begin();
                })) // Handle final logs, optionally set feature loading to false
            );
// ...
```

## Ultimately

What this approach seeks to accomplish is to establish a genuine Data Driven Architecture that is maintainable and encapsulated from the main state via the internal handling of **the ActionStrategy payload** in NgRx.
The goal of each implementation should be a verbose declaration of steps needed to solve a problem. In the pseudo example we created this sentence:

```javascript
// Retrieve a text file from the server; if we encounter an error send to our log service; otherwise parse out the hero names in the file; finally, add parsed data to the UI.
```

The power of NgRx Effects in combination with ActionStrategy, is that the implementation of per problem is obfuscated. As long as each strategic action returns the next, **what matters is the steps to solving the larger goal.** Where the implementation is handled does not matter, this approach merely encapsulates NodeJS's advantage speed of I/O in comparison to other platforms.

## Testing

Although this is not the official v1 the ActionStrategy Object itself is solid on the NgRx platform.
And due it it's generative nature, the best means I have found to test it is to log each ActionStrategy object to console. Then dig into it's parameters. Namely: actionList which is an array of steps taking.

If you find this and understand why it was made. Have fun with it, this is a genuine new approach to application programming and this README is just the tip of the iceberg. If you have any questions, or comments please feel free to open an issue or find my contact through the ActionStrategy's repository github page.

CI tests to come along revealing a proof of concept application.