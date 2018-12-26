import React, {Component} from 'react';
import './App.css';
import Particles from 'react-particles-js';
import Navigation from './components/Navigation/Navigation';
import Logo from './components/Logo/Logo';
import ImageLinkForm from './components/ImageLinkForm/ImageLinkForm';
import Rank from './components/Rank/Rank';
import FaceRecognition from './components/FaceRecognition/FaceRecognition' ;
import Signin from './components/Signin/Signin';
import Register from './components/Register/Register';
import Clarifai from 'clarifai';

let app;
async function getKey() {
    const response = await fetch('http://localhost:3000/clarifaiApiKey');
    const apiKey = await response.json();
    app = new Clarifai.App({
        apiKey
    });
}
getKey();

// Params config for particles
const particlesOptions = {
    particles: {
        number: {
            value: 100,
            density: {
                enable: true,
                value_area: 800
            }
        }
    }
};

class App extends Component {

    constructor() {
        super();
        this.state = {
            inputUrl: '',
            imageUrl: '',
            box: {},
            route: 'signin',
            isSignedIn: false,
            user: {
                id: '',
                name: '',
                email: '',
                entries: 0,
                joined: ''
            }
        }
    }

    loadUser = (data) => {
        this.setState({
            user: {
                id: data.id,
                name: data.name,
                email: data.email,
                entries: data.entries,
                joined: new Date()
            }
        });
    }

    // Calculate the location of face box
    calculateFaceBox = (data) => {
        const clarifaiBoundingBox = data.outputs[0].data.regions[0].region_info.bounding_box;
        const inputImage = document.getElementById('inputImage');
        const imgWidth = Number(inputImage.width);
        const imgHeight = Number(inputImage.height);
        return {
            left: clarifaiBoundingBox.left_col * imgWidth,
            right: imgWidth - (clarifaiBoundingBox.right_col * imgWidth),
            top: clarifaiBoundingBox.top_row * imgHeight,
            bottom: imgHeight - (clarifaiBoundingBox.bottom_row * imgHeight)
        };
    };

    setFacebox = (box) => {
        this.setState({box: box});
    };

    onInputChange = (event) => {
        this.setState({inputUrl: event.target.value});
    };

    onButtonSubmit = () => {
        this.setState({imageUrl: this.state.inputUrl});
        app.models
            .predict(
                Clarifai.FACE_DETECT_MODEL,
                this.state.inputUrl)
            .then(response => {
                // Call /image endpoint to update user entry submitted
                fetch('http://localhost:3000/image', {
                    method: 'put',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id: this.state.user.id
                    })
                })
                    .then(response => response.json())
                    .then(userEntries => {
                        // user object.assign to set entries property and doesn't intervene with other property
                        this.setState(Object.assign(this.state.user, {entries: userEntries}));
                    });

                // Calcualte and set facebox
                this.setFacebox(this.calculateFaceBox(response))
            })
            .catch(err => console.log(err));
    };

    onRouteChange = (route) => {
        if (route === 'home') {
            this.setState({isSignedIn: true});
        } else if (route === 'signin') {
            this.setState({isSignedIn: false});
        }

        this.setState({route: route});
    };

    render() {
        const {isSignedIn, route, imageUrl, box} = this.state;
        return (
            <div className="App">
                <Particles className='particles' params={particlesOptions}/>
                <Navigation onRouteChange={this.onRouteChange} isSignedIn={isSignedIn}/>
                {route === 'signin'
                    ? <Signin loadUser={this.loadUser} onRouteChange={this.onRouteChange}/>
                    : (
                        route === 'register'
                            ? <Register loadUser={this.loadUser} onRouteChange={this.onRouteChange}/>
                            : <div>
                                <Logo/>
                                <Rank name={this.state.user.name} entries={this.state.user.entries}/>
                                <ImageLinkForm
                                    onInputChange={this.onInputChange}
                                    onButtonSubmit={this.onButtonSubmit}/>
                                <FaceRecognition faceBox={box} imageUrl={imageUrl}/>
                            </div>
                    )
                }
            </div>
        );
    }
}

export default App;
