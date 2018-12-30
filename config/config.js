let isDev = process.env.NODE_ENV === 'development';

module.exports = {
    FB_PAGE_TOKEN: 'EAAfHTH6IfJEBALCSbAHd60nZBLxfvpcqCJV3eMmyQNJZA18ATPqTQFUW0LQcdZArL4eUjgjsEyPljmCP8tYjHS110DA6EhwngFtaHnLmkjeN7cVZCZB4KxNWrgZAAZBksGcEQDOjVuZBGsgRWOyqrcsZBumFI59ZANW6bznBGo5tuWkgZDZD',
    FB_VERIFY_TOKEN: 'jr3MY%dVP!x|T(M',
    API_AI_CLIENT_ACCESS_TOKEN: 'c8c12099f6014f6aa3a921eb62d9d7c8',
    FB_APP_SECRET: 'bde185688c61e33d24421cff85f0e32c',
    SERVER_URL: isDev ? "https://6e7af151.ngrok.io/" : "https://filaelectronica.herokuapp.com/",
    GMAPS_API_TOKEN: 'AIzaSyCRakNczYQCqEIPwR516793xtmh-8qtj5g',
    URL_API: '127.0.0.1:3000'
};