import React,{ useEffect,useState } from 'react';
import { StyleSheet,SafeAreaView, Platform, StatusBar } from 'react-native';
import Home from './src/screens/Home.screen';

export default function App() {
  const [isTfReady,setIsTfReady] = useState(false);

  useEffect(()=>{
    async function load(){
      await tf.ready();
      setIsTfReady(true);
    }
    load()
  },[])

  return (
    <SafeAreaView style={styles.container}>
      <Home/>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
});
