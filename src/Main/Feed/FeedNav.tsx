import React, { useEffect } from "react";

import { Feed } from "./Feed";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// import { requestPermissions } from "expo-sample-pedometer";

import variaveis from "../../colors/variaveis";

const Stack = createNativeStackNavigator();

export const FeedNav = () => {
  useEffect(() => {
    // requestPermissions();
  }, []);



  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: variaveis.primaryColor,
        },
        headerTitleStyle: {
          color: "white",
        },
      }}
    >
      <Stack.Screen
        name="FeedScreen"
        component={Feed}
        options={{
          headerTitle: "IntruderAlert",
        }}
      />

    </Stack.Navigator>
  );
};
