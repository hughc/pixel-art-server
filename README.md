# Pixel Stream
This is simple client server to supply images to matrices of different sizes.

![screen](/images/screen-large.jpg)
![screenshot](/images/screenshot.png)

## Hardware requirements
The hardware consists of 3 parts:

 - an LED matrix, either off-the-shelf or handmade using LED strips joined together to form a grid (WS2812, WS2815 etc)
 - a wifi enabled microcontroller (ESP8266, such as Wemos D1 mini)
 - a server, either on your LAN or accessible over the internet. This does not have to be powerful- a Raspberry Pi zero will do.

Other components include a push button wired to the microcontroller to trigger a configuration portal, and a buck transformer to run the microcontroller if the strip runs at 12V (the ESP8266 runs at 5V).

To generate a clean matrix with square pixels, you need a diffuser screen. [This design](https://www.thingiverse.com/thing:4973163) can be used to 3D print arbitrary sized diffusers. 

## Software
The software consists of 3 parts:

 - client firmware, which requests images and uses the FastLED sets pixel RGB values (client-wifi-portal/src/client-wifi-portal.ino). This can be flashed using the platform.io VSCode extension.
 - the server process which decodes images (jpg, gif, png) to raw pixel values and sends them to the client (server)
 - a React admin app, to manage image upload, client configuration for multiple clients, and playlist curation (admin/src/App.js)


 ### Firmware
 The firmware leverages the [FastLED](https://github.com/FastLED/FastLED) and [ESP2866 WifiManager](https://github.com/tzapu/WiFiManager) libraries. It requests images over http from the server component, and is returned some metadata such as brightness, the interval before the next image will be requested, and then a series of RGB values, corresponding to the size of the matrix. It listens for a button press on a defined pin at startup, and if detected launches a wifi configuration portal that allows the configuration of a 0connection to an existing wifi network as well as setting the address of the server to connect to. 


 Before compiling the client firmware, there are a couple of parameters you will likely want to change.
 
 - the LED type, a constant as defined in the FastLED library
 - the number of LEDs in the matrix (required to define the FastLED array)
 - a unique identifier for the client (used when making requests)

 Other potential configuration options are the digital pin assignments used to control the strip, and the button to trigger the configuration mode.

 ### Server
 This is a node.js process that accepts and stores the system's data as json files (one for the clients metadata, the other for the cofiguration of the playlists of images to be shown). It also responds to requests for images from clients, keeping tack of their progress through their assigned playlists and loading images, decoding them to text strings of rgb values, and returning those values to a client. It has some understanding of multi-frame gif images, but the clients' ability to decode multiframe gifs is limited by the memory of the device (with 1024 pixels, a 32x32 matrix cannot currently handle multi-frame gifs).

 Images are stored in the `img` directory under the server. A given image's unique ID is its path relative to the `img` dir.

 Clients make only 2 calls to the server:
  -  On boot, the attempt a connection to `/checkin`, passing the `id` stored in their firmware, and the number of pixels they have. This registers a new client allowing it to be configured in the administration interface.  
  example: `http://192.168.0.xx/checkin?id=my-grid-id&pixelCount=256`

  - after this, the client repeatedly calls the `/image` endpoint to request images for display, including its `id` to identify which playlist to load the next image from. The spacing of these calls is determined by the metadata returned from the server (an attribute of the playlist).  
  example: `http://192.168.0.xx/image?id=my-grid-id` 
 
 ### Admin interface
 The React app provides a mechanism to configure multiple clients, upload images, and to compile playlists from uploaded iamges and then assign those playlists to clients. It uses [Bootstrap 4 components](https://react-bootstrap-v4.netlify.app/) for UI and [Recoil](https://recoiljs.org/) for state management.

 ## Build and setup
 The project is not optimally structured at this stage; some manual combination of files is required to get it running. 
 
 To build the admin app, which is based on [create-react-app](https://reactjs.org/docs/create-a-new-react-app.html): 
 
 - from within the `admin` directory, first install the required dependencies by running `yarn`.
 - then run either `yarn start` to launch a development server, or `yarn build` to create a release version. 
 - once you have created a build, the `build` folder should be copied into the `server' directory, where it will be served by the node.js process.

To start the server:
 - with nodejs installed, run `yarn` from within the server directory to load dependencies
 - from within the same dir run `node ./server.js` to start the server. Use the `--port xxxx` switch to choose a port to run it on. The admin interface should be available at this point. 
 - if you wish to run the server at system startup, I recommend installing [pm2](https://github.com/Unitech/pm2), the node process manager. You can then add the server process to pm2 with the command `pm2 start server.js --node-args="--port xxxx"`

 To configure the client ESP8266:
  - with the firmware flashed, boot the microcontroller. The matrix has 3 diagnostic colours
      - Red - booting, no wifi connection
      - Green - wifi network connection established
      - Yellow - in configuration AP mode
 
To get into configuration mode, to sonfigure a connection to your network, press and hold the button you defined when compiling the firmware. In configuration mode, you can enter the SSID and password for your wifi network, and, at the bottom, the IP address of the server that you set up in the previous step (do not put a trailing slash on this address). Once the settings are saved, reboot it. If it goes green, then the wifi is correctly connected, if your server is running, it should then check-in and start to request an image.
  