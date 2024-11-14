import type { SSTConfig } from "sst"
import { MyStack } from "./stack/MyStack";


export default {
  config(input) {
    return {
      name: "app",
      region: "us-east-1"
    }
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "nodejs18.x"
    })

    app.addDefaultFunctionPermissions("*")
    app
      .stack(MyStack)
    //   .stack(Dynamo)
  },
} satisfies SSTConfig