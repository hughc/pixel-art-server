# Pixel Art Server
This is simple server to supply images to WLED matrices of different sizes.

![screen](/screenshots/screen-large.jpg)
![admin interface](/screenshots/admin.jpg)

## Hardware requirements
The hardware consists of 3 parts:

 - an LED matrix, either off-the-shelf or handmade using LED strips joined together to form a grid (WS2812, WS2815 etc)
 - a wifi enabled microcontroller (ESP8266, such as Wemos D1 mini)
 - a server, either on your LAN or accessible over the internet. This does not have to be powerful- a Raspberry Pi zero will do.

Other components include a push button wired to the microcontroller to trigger a configuration portal, and a buck transformer to run the microcontroller if the strip runs at 12V (the ESP8266 runs at 5V).

To generate a clean matrix with square pixels, you need a diffuser screen. [This design](https://www.thingiverse.com/thing:4973163) can be used to 3D print arbitrary sized diffusers. 

## Server setup
 The server software decodes images (jpg, gif, png) to raw pixel values and sends them to the client. It includes an admin interface that allows for uploading images and curating playlists of images, including setting background colours for transparent images. 

 This is a node.js process that accepts and stores client and playlist data as json files (one for the clients metadata, the other for the configuration of the playlists of images to be shown).
 
 It also responds to requests for images from clients, keeping tack of their progress through their assigned playlists and loading images, decoding them to text strings of rgb values, and returning those values to a client. It understands multi-frame gif images, but the clients' ability to decode multiframe gifs is limited by the memory of the device - an ESP32 is arecommended for the extra memory provided.

 Images are stored in the `img` directory under the server. A given image's unique ID is its path relative to the `img` dir. You do not have to use the provided upload mechanism, you can instead just place images in the directory in question. 

 Clients make only 2 calls to the server:
  -  On boot, the attempt a connection to `/checkin`, passing the `id` stored in their firmware. This registers a new client allowing it to be configured in the administration interface.  
  example: `http://192.168.0.xx/checkin?id=my-grid-id`

  - after this, the client repeatedly calls the `/image` endpoint to request images for display, including its `id` to identify which playlist to load the next image from. It also supplies a wifth and height, to indicate to the server the data required. 
  
  The timing of these calls (ie the display time per image) is determined by the metadata returned from the server (an attribute of the playlist).  
  example: `http://192.168.0.xx/image?id=my-grid-id&width=16&height=16` 

## setup
To start the server:
 - with nodejs installed, run `yarn` from within the server directory to load dependencies
 - from within the same dir run `node ./server.js` to start the server. Use the `--port xxxx` switch to choose a port to run it on. The admin interface should be available at this point. 
 - if you wish to run the server at system startup, I recommend installing [pm2](https://github.com/Unitech/pm2), the node process manager. You can then add the server process to pm2 with the command `pm2 start server.js -- --port xxxx"` and `pm2 save` to save te config for re-running on startup.

