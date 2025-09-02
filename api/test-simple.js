module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Simple API test',
    timestamp: new Date().toISOString()
  });
};
