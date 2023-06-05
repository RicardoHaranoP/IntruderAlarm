import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
  Switch,
} from "react-native";

import { FeedWorkout } from "../../Types/FeedWorkout";
import { CTAButton } from "../../Components/CTAButton/CTAButton";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";


import { StatusBar } from "expo-status-bar";

import variaveis from "../../colors/variaveis";
import { format, isValid } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

import auth from '@react-native-firebase/auth'
import db from "@react-native-firebase/database"


export const Feed = () => {
  const nav = useNavigation<NativeStackNavigationProp<any>>();

  const [username, setUsername] = useState<string>('');

  const [feed, setFeed] = useState<FeedWorkout[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [limit, setLimit] = useState(5);

  const [isEnabled, setIsEnabled] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [aux, setAux] = useState(false);

  const pegandoHistorico = useCallback(async (currentUser: string) => {
    await db()
      .ref(`/users/${currentUser}/estadoAlarme/alarmHistory`)
      .on('value', snapshot => {
        const data = snapshot.val();
        if (data) {
          const historico = Object.values(data).slice(1)

          const historicoFormatado = historico.map((item: any) => ({
            ...item,

            date: item.date ? format(utcToZonedTime(new Date(item.date), 'America/Sao_Paulo'), 'dd/MM/yyyy HH:mm:ss') : '',
          }))
            .reverse()

            historicoFormatado.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          setFeed(historicoFormatado)


        }

        // console.log('User data: ', snapshot.val());

      });
  }, []);


  const getUltimoValor = useCallback(async (currentUser: string) => {
    const snapshot = await db()
      .ref(`/users/${currentUser}/estadoAlarme/alarmHistory`)
      .once('value');
      const historico: { date: string, valor: boolean }[] = snapshot.val();
    const valores = Object.values(historico);
    valores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const ultimoValor = valores[valores.length - 1] as { valor: boolean } | undefined;;

    if (typeof ultimoValor?.valor === 'boolean') {
      setIsEnabled(ultimoValor.valor);
    }
//
    return (ultimoValor?.valor)
  }, []);

  const getUser = useCallback(async (currentUser: string) => {
    const snapshot = await db()
      .ref(`users/${currentUser}`)
      .once('value');
      const nome = snapshot.val().name;

      setUsername(nome)
  }, [])

  useEffect(() => {
    // Load all the workouts on the user's profile
    const currentUser = auth().currentUser!;

    if (currentUser) {
      getUser(currentUser.uid);
    }

    if (isFirstRender) {
      getUltimoValor(currentUser.uid);
    }

    if (!isFirstRender && aux) {
      enviadoParaMudarEstado(isEnabled);
    } else {
      setIsFirstRender(false);
    }

    pegandoHistorico(currentUser.uid);

    setAux(false)

  }, [isEnabled]);



  const saveEstadoAlarme = async (valor: boolean, currentUser: string) => {
    const sessaoID = Date.now()

    await db().ref(`/users/${currentUser}/estadoAlarme/alarmHistory`).push({
      valor,
      date: sessaoID,
    })

  }

  const enviadoParaMudarEstado = async (valor: boolean) => {
    const currentUser = auth().currentUser
    if (currentUser) {
      await saveEstadoAlarme(valor, currentUser.uid);
    }
  };

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
      <StatusBar backgroundColor= {variaveis.primaryColor} />
      <Text style={styles.text}>Bem-vindo, {username}</Text>
      <CTAButton title="Logout" onPress={logout} variant="secondary" />
      <View style={[styles.buttonContainer, isEnabled ? { backgroundColor: variaveis.primaryColor } : { backgroundColor: variaveis.vermelho },]}>
        <CTAButton variant="secondary" title={isEnabled ? "Ligado" : "Desligado"} onPress={toggleSwitch} />
        <Switch
          thumbColor="transparent"
          trackColor={{ false: "transparent", true: "transparent" }}
          onValueChange={toggleSwitch}
          value={isEnabled}
        />

      </View>
      <FlatList
        data={feed}
        renderItem={({ item }) =>
          <View style={styles.item}>
            <Text style={styles.title}>{item.date !== undefined ? item.date : ''}</Text>
            <Text style={styles.title}>{item.valor !== undefined ? item.valor.toString() : 'N/A'}</Text>

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
});
