// @ts-nocheck

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  Switch,
  Platform,
  Animated,
} from "react-native";

import { FeedWorkout } from "../../Types/FeedWorkout";
import { CTAButton } from "../../Components/CTAButton/CTAButton";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";


import { StatusBar } from "expo-status-bar";

import variaveis from "../../colors/variaveis.js";
import { format, isValid } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import auth from '@react-native-firebase/auth'
import db from "@react-native-firebase/database"

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const Feed = () => {
  const nav = useNavigation<NativeStackNavigationProp<any>>();

  const [username, setUsername] = useState<string>('');

  const [feed, setFeed] = useState<FeedWorkout[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [limit, setLimit] = useState(5);

  const [sirene, setSirene] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [aux, setAux] = useState(false);

  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<any>(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const backgroundColor = useRef(new Animated.Value(0)).current;

  async function registerForPushNotificationsAsync(): Promise<string> {
    let token = '';
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return 'error';
      }
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
    } else {
      alert('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }


  const pegandoHistorico = useCallback(async (currentUser: string) => {
    await db()
      .ref(`/users/${currentUser}/estadoAlarme/alarmHistory`)
      .on('value', snapshot => {

        const data = snapshot.val();
        if (data) {
          const historico = Object.values(data)
          
          historico.sort((a, b) => a.date - b.date);


          const historicoFormatado = historico.map((item: any) => ({
            ...item,

            date: item.date ? format(utcToZonedTime(new Date(item.date), 'America/Sao_Paulo'), 'dd/MM/yyyy HH:mm:ss') : '',
          }))
            .reverse()



          // historicoFormatado.map((item: any) => (
          //   console.log('fim: ', item.date)
          // ))


          setFeed(historicoFormatado)


        }

        // console.log('User data: ', snapshot.val());

      });
  }, []);


  const getUltimoValor = useCallback(async (currentUser: string) => {
    const snapshot = await db()
      .ref(`/users/${currentUser}/estadoAlarme/alarmHistory`)
      .once('value');
    const historico: { date: string, ativa: boolean }[] = snapshot.val();
    const valores = Object.values(historico);
    valores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ultimoValor = valores[valores.length - 1] as { ativa: boolean } | undefined;;


    const valorAtiva= await db().ref(`/users/${currentUser}/estadoAlarme/ativa`).on('value');
    const valor = valorAtiva.val()
    setIsEnabled(valor);

    const valorAciona= await db().ref(`/users/${currentUser}/estadoAlarme/aciona`).on('value');
    const valorAcionaAux = valorAciona.val()
    setSirene(valorAcionaAux);
 
    //
    return (ultimoValor?.ativa)
  }, []);

  const getUser = useCallback(async (currentUser: string) => {
    const snapshot = await db()
      .ref(`users/${currentUser}`)
      .once('value');
    const nome = snapshot.val().name;

    setUsername(nome)
  }, [])

  useEffect(() => {

    const currentUser = auth().currentUser!

    if (currentUser) {
      getUser(currentUser.uid);
      monitorarAtiva(currentUser.uid);
      getUltimoValor(currentUser.uid);
      pegandoHistorico(currentUser.uid);
      monitorarSirene(currentUser.uid);
    }

    console.log('useEffect sem dependencias')
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };


  }, []);


  useEffect(() => {
    // Load all the workouts on the user's profile
    const currentUser = auth().currentUser!;


    if (currentUser) {
      getUser(currentUser.uid);
      monitorarAtiva(currentUser.uid)
      getUltimoValor(currentUser.uid)
      pegandoHistorico(currentUser.uid);
    }


    

    if (!isFirstRender && aux) {
      enviadoParaMudarEstado(isEnabled, sirene);
    } else {
      setIsFirstRender(false);
    }

    

    setAux(false)
    console.log('useEffect isEnabled')
  }, [isEnabled]);

  useEffect(() => {
    // Animação de piscar em vermelho e amarelo
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(backgroundColor, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(backgroundColor, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    if (sirene) {
      startAnimation();
    }
  }, [sirene]);

  const monitorarSirene = useCallback(async (currentUser: string) => {
    await db()
      .ref(`/users/${currentUser}/estadoAlarme/aciona`)
      .on('value', snapshot => {
        const valorAciona = snapshot.val();
        setSirene(valorAciona);
      });
      console.log('monitorarSirene')
  }, []);

  const monitorarAtiva = useCallback(async (currentUser: string) => {
    await db()
      .ref(`/users/${currentUser}/estadoAlarme/ativa`)
      .on('ativa', snapshot => {
        const valorAtiva = snapshot.val();
        setIsEnabled(valorAtiva);
      });
      console.log('monitorarAtiva')
  }, []);

  const saveEstadoAlarme = async (ativa: boolean, aciona: boolean, currentUser: string) => {

    const sessaoID = Date.now()

    await db().ref(`/users/${currentUser}/estadoAlarme/alarmHistory`).push({
      ativa,
      aciona,
      date: sessaoID,
    })

    await db().ref(`users/${currentUser}/estadoAlarme`).update({
      ativa,
      aciona,
      date: sessaoID,
    })

  }

  const enviadoParaMudarEstado = async (valor: boolean, aciona: boolean) => {
    const currentUser = auth().currentUser
    if (currentUser) {
      await saveEstadoAlarme(valor, aciona, currentUser.uid);
    }
  };

  const handleCallNotification = async () => {
    try {
      const projectId = '@intruderalertandroid/teste';
      let token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId })).data;
      console.log(token);
    } catch (error) {
      console.log('Ocorreu um erro ao obter o token de push:', error);
    }
  }

  const toggleSwitch = () => {
    setIsEnabled((previousState) => !previousState);
    setAux(true);
  };

  const logout = async () => {
    try {
      await auth().signOut();
      nav.replace("Login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };


  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <StatusBar backgroundColor={variaveis.primaryColor} />
      <Text style={styles.text}>Bem-vindo, {username}</Text>
      <CTAButton title="Logout" onPress={logout} variant="secondary" />
      <View style={[styles.buttonContainer, isEnabled ? { backgroundColor: variaveis.primaryColor } : { backgroundColor: variaveis.vermelho },]}>
        <CTAButton variant="secondary" title={isEnabled ? "Acionado" : "Desligado"} onPress={toggleSwitch} />
        <Switch
          thumbColor="transparent"
          trackColor={{ false: "transparent", true: "transparent" }}
          onValueChange={toggleSwitch}
          value={isEnabled}
        />

      </View>
      
        {sirene && (
          <Animated.View
            style={[
              styles.blinkingArea,
              {
                backgroundColor: backgroundColor.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['yellow', 'red'],
                }),
              },
            ]}
          >
            <Text style={styles.blinkingText}>Sirene Acionada</Text>
          </Animated.View>
        )} 
     
      <View>
        <CTAButton
          title="Press to Send Notification"
          onPress={handleCallNotification}
          variant="secondary"
        />
      </View>
      <FlatList
        data={feed}
        renderItem={({ item }) =>
          <View style={styles.item}>
            <Text style={styles.title}>{item.date !== undefined ? item.date : ''}</Text>
            <Text style={styles.title}>Alarme: {item.ativa !== undefined ? (item.ativa ? 'ligado' : 'desligado') : 'N/A'}</Text>
            <Text style={styles.title}>Sirene: {item.aciona !== undefined ? (item.aciona ? 'tocando' : 'desligada') : 'N/A'}</Text>

          </View>
        }
        contentContainerStyle={{
          paddingBottom: 20,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: 'black',
    textAlign: "center",
  },
  item: {
    backgroundColor: 'gainsboro',
    padding: 20,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 20,
  },
  blinkingArea: {
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    marginBottom: 20,
    justifyContent: "center",
  },
  blinkingText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
