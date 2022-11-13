import React,{ useState,useEffect,useRef } from "react";
import { View,Text,StyleSheet,TouchableOpacity, Platform, Button } from "react-native";
import * as tf from '@tensorflow/tfjs'
import { bundleResourceIO,cameraWithTensors,fetch,decodeJpeg } from '@tensorflow/tfjs-react-native'
import { Camera } from 'expo-camera'

const TensorCamera = cameraWithTensors(Camera);
const textureDims = Platform.OS === 'ios' ? { height:1280,width:1080 } : { height:1200,width:1600 }

const OUTPUT_TENSOR_WIDTH = 270;
const OUTPUT_TENSOR_HEIGHT = 480;

const Home = ()=>{
    const [isTfReady,setIsTfReady] = useState(false);
    const [ourModel,setOurModel]  = useState();
    const [isSimiling,setIsSmiling] = useState(false);
    const [isCameraRequired,setIsCameraRequired] = useState(false);
    const [isCameraReady,setIsCameraReady] = useState(false);
    const rafId = useRef(null);
    const cameraRef = useRef(null);


    useEffect(()=>{
        async function load(){
            await tf.ready();
            
            rafId.current=null;

            await tf.env().set('WEBGL_PACK_DEPTHWISECONV', false);

            await Camera.requestCameraPermissionsAsync();

            const modelJson = require('../model/model.json');
            const modelWeight = require('../model/weights.bin')

            const model = await tf.loadLayersModel(bundleResourceIO(modelJson,modelWeight));

            setOurModel(model);
            
            setIsTfReady(true);
        }

        load()
    },[])


    useEffect(() => {
        return () => {
          if (rafId.current != null && rafId.current !== 0) {
            cancelAnimationFrame(rafId.current);
            rafId.current = 0;
          }
        };
      }, []);

    async function predict(imgUrl){
        // console.log(imgUrl)
        const imageUri = 'https://www.biggerbolderbaking.com/wp-content/uploads/2020/01/2-Ingredient-Ice-cream-Thumbnail-scaled.jpg';
        const response = await fetch('https://'+imgUrl, {}, { isBinary: true });
        // console.log(response)
        const imageDataArrayBuffer = await response.arrayBuffer();
        const imageData = new Uint8Array(imageDataArrayBuffer);

        // Decode image data to a tensor
        const imageTensor = decodeJpeg(imageData);

        const f =
              (OUTPUT_TENSOR_HEIGHT - OUTPUT_TENSOR_WIDTH) /
              2 /
              OUTPUT_TENSOR_HEIGHT;
            const cropped = tf.image.cropAndResize(
              // Image tensor.
              imageTensor.expandDims(0),
              // Boxes. It says we start cropping from (x=0, y=f) to (x=1, y=1-f).
              // These values are all relative (from 0 to 1).
              tf.tensor2d([f, 0, 1 - f, 1], [1, 4]),
              // The first box above
              [0],
              // The final size after resize.
              [224, 224]
            );
            const result = ourModel.predict(cropped);
            const logits = result.dataSync();
            if (logits) {
                setIsSmiling(logits[0] > logits[1]);
            } else {
                setIsSmiling(null);
            }

    }

    const handleCameraStream = (images, updatePreview, gl) => {
        // Here, we want to get the tensor from each frame (image), and feed the
        // tensor to the model (which we will train separately).
        //
        // We will do this repeatly in a animation loop.

        console.log(images)

        const loop = () => {
    
          // Wrap this inside tf.tidy to release tensor memory automatically.
          tf.tidy(() => {
            // Get the tensor.
            //
            // We also need to normalize the tensor/image rgb data from 0-255
            // to -1 to 1.
            //
            // We also need to add an extra dimension so its shape is [1, w, h, 3].
            const imageTensor = images ? images.next().value.expandDims(0).div(127.5).sub(1) : 0;

            // From teachable machine, we know that the input image will be
            // cropped from the center and resized to 224x224. So we need to do
            // the same thing here. Luckily tfjs has utility for this.
            //
            // Read more about these in tfjs's repo:
            // https://github.com/tensorflow/tfjs
            //
            // calculate the relative Y position (0-1) to start croppging the
            // image. BTW we assume the image is in portrait mode.
            //
            // Feel free to handle landscape mode here.
            const f =
              (OUTPUT_TENSOR_HEIGHT - OUTPUT_TENSOR_WIDTH) /
              2 /
              OUTPUT_TENSOR_HEIGHT;
            const cropped = tf.image.cropAndResize(
              // Image tensor.
              imageTensor,
              // Boxes. It says we start cropping from (x=0, y=f) to (x=1, y=1-f).
              // These values are all relative (from 0 to 1).
              tf.tensor2d([f, 0, 1 - f, 1], [1, 4]),
              // The first box above
              [0],
              // The final size after resize.
              [224, 224]
            );
            const result = ourModel.predict(cropped);
            const logits = result.dataSync();
            console.log(logits)
            if (logits) {
                setIsSmiling(logits[0] > logits[1]);
            } else {
                setIsSmiling(null);
            }
        });
            console.log(isSimiling)

          rafId.current = requestAnimationFrame(loop);
        };
        

        loop();
      };

   return isTfReady ? (
        <View style={styles.contain}>
            {
                isCameraRequired ? (
                    <TouchableOpacity style={styles.CameraContainer} onPress={()=> setIsCameraRequired(!isCameraRequired)}>
                        {
                            !isSimiling ? <View style={{backgroundColor:'black'}}><Text style={{color:'green'}}>Pizza</Text></View>:<Text style={{color:"red"}}>Not Pizza!</Text>
                        }

                        {/* <TensorCamera style={styles.camera}
                            type={ Camera.Constants.Type.back }
                            cameraTextureHeight={textureDims.height}
                            cameraTextureWidth={textureDims.width}
                            resizeHeight={200}
                            resizeWidth={152}
                            resizeDepth={3}
                            onReady={handleCameraStream}
                            autorender={true}
                        /> */}
                        <TouchableOpacity style={{ width:500,height:500 }} >
                            <Camera style={{width:500,height:500}} ref={(camera) => { cameraRef.current=camera }} type={Camera.Constants.Type.back} onCameraReady={()=>{ setIsCameraReady(true) }} />
                        </TouchableOpacity>
                        <Button title="Click Picture" onPress={async ()=>{
                            console.log('hello')
                            if(cameraRef){
                                const photo = await cameraRef.current.takePictureAsync();
                                console.log(photo)
                                predict(photo.uri);
                            }
                        }}></Button>
                    </TouchableOpacity>
                ) : <TouchableOpacity style={styles.Cam} onPress={()=> setIsCameraRequired(!isCameraRequired)}>
                <Text style={styles.text}>Upload Image/Use Camera</Text>
            </TouchableOpacity>
            }
            
        </View>
    ): <Text>Loading....</Text>
}

const styles = StyleSheet.create({
    contain:{
        flex:1,
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'#8458B3'
    },
    Cam:{
        flex:0.28,
        borderColor:'lightblue',
        borderWidth:4,
        width:240,
        height:240,
        borderStyle: 'dotted',
        borderRadius: 1,
        justifyContent:'center',
        alignItems:'center',
    },
    camera: {
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
    CameraContainer:{
        width:'100%',
        height:'100%'
    },
    text:{
        color:'blue',
        fontSize:16,
        fontWeight:'bold'
    },
    CameraContainer:{
        width: '100%',
        height: '100%',
        justifyContent:'center',
        alignItems:'center'
    }
})

export default Home