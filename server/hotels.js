// Static hotel database for autocomplete search
// ~150 popular hotels across Brazil and international destinations

export const hotels = [
  // === BRASIL - Rio de Janeiro ===
  { name: 'Copacabana Palace', destination: 'Rio de Janeiro, Brasil', stars: 5 },
  { name: 'Hotel Fasano Rio de Janeiro', destination: 'Rio de Janeiro, Brasil', stars: 5 },
  { name: 'Hilton Copacabana', destination: 'Rio de Janeiro, Brasil', stars: 5 },
  { name: 'JW Marriott Hotel Rio de Janeiro', destination: 'Rio de Janeiro, Brasil', stars: 5 },
  { name: 'Grand Hyatt Rio de Janeiro', destination: 'Rio de Janeiro, Brasil', stars: 5 },
  { name: 'Sheraton Grand Rio Hotel & Resort', destination: 'Rio de Janeiro, Brasil', stars: 5 },
  { name: 'Windsor Atlantica Hotel', destination: 'Rio de Janeiro, Brasil', stars: 4 },
  { name: 'Ibis Copacabana', destination: 'Rio de Janeiro, Brasil', stars: 3 },
  { name: 'Novotel Rio de Janeiro Botafogo', destination: 'Rio de Janeiro, Brasil', stars: 4 },
  { name: 'Hotel Negresco', destination: 'Rio de Janeiro, Brasil', stars: 3 },
  // === BRASIL - Sao Paulo ===
  { name: 'Hotel Fasano Sao Paulo', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Tivoli Mofarrej Sao Paulo', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Grand Hyatt Sao Paulo', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Renaissance Sao Paulo Hotel', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Hotel Unique', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Palacio Tangara', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'InterContinental Sao Paulo', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Hilton Sao Paulo Morumbi', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Melia Paulista', destination: 'Sao Paulo, Brasil', stars: 4 },
  { name: 'Ibis Paulista', destination: 'Sao Paulo, Brasil', stars: 3 },
  { name: 'Novotel Sao Paulo Jaragua', destination: 'Sao Paulo, Brasil', stars: 4 },
  // === BRASIL - Salvador ===
  { name: 'Fera Palace Hotel', destination: 'Salvador, Brasil', stars: 5 },
  { name: 'Pestana Convento do Carmo', destination: 'Salvador, Brasil', stars: 5 },
  { name: 'Hotel Fasano Salvador', destination: 'Salvador, Brasil', stars: 5 },
  { name: 'Wish Hotel da Bahia', destination: 'Salvador, Brasil', stars: 4 },
  { name: 'Ibis Salvador Rio Vermelho', destination: 'Salvador, Brasil', stars: 3 },
  // === BRASIL - Florianopolis ===
  { name: 'Il Campanario Villaggio Resort', destination: 'Florianopolis, Brasil', stars: 5 },
  { name: 'Costao do Santinho Resort', destination: 'Florianopolis, Brasil', stars: 5 },
  { name: 'Majestic Palace Hotel', destination: 'Florianopolis, Brasil', stars: 5 },
  { name: 'Ponta dos Ganchos Resort', destination: 'Florianopolis, Brasil', stars: 5 },
  { name: 'Novotel Florianopolis', destination: 'Florianopolis, Brasil', stars: 4 },
  // === BRASIL - Recife / Porto de Galinhas ===
  { name: 'Nannai Resort & Spa', destination: 'Porto de Galinhas, Brasil', stars: 5 },
  { name: 'Summerville Beach Resort', destination: 'Porto de Galinhas, Brasil', stars: 5 },
  { name: 'Hotel Armacao', destination: 'Porto de Galinhas, Brasil', stars: 4 },
  { name: 'Mar Hotel Recife', destination: 'Recife, Brasil', stars: 4 },
  // === BRASIL - Fortaleza ===
  { name: 'Gran Marquise Hotel', destination: 'Fortaleza, Brasil', stars: 5 },
  { name: 'Hotel Gran Mareiro', destination: 'Fortaleza, Brasil', stars: 4 },
  { name: 'Seara Praia Hotel', destination: 'Fortaleza, Brasil', stars: 4 },
  // === BRASIL - Brasilia ===
  { name: 'Royal Tulip Brasilia Alvorada', destination: 'Brasilia, Brasil', stars: 5 },
  { name: 'Melia Brasilia', destination: 'Brasilia, Brasil', stars: 4 },
  // === BRASIL - Belo Horizonte ===
  { name: 'Mercure Belo Horizonte Lourdes', destination: 'Belo Horizonte, Brasil', stars: 4 },
  { name: 'Quality Hotel Belo Horizonte', destination: 'Belo Horizonte, Brasil', stars: 3 },
  // === BRASIL - Curitiba ===
  { name: 'Radisson Hotel Curitiba', destination: 'Curitiba, Brasil', stars: 4 },
  { name: 'Four Points by Sheraton Curitiba', destination: 'Curitiba, Brasil', stars: 4 },
  // === BRASIL - Manaus ===
  { name: 'Juma Ópera Hotel', destination: 'Manaus, Brasil', stars: 4 },
  { name: 'Tropical Manaus Ecoresort', destination: 'Manaus, Brasil', stars: 4 },
  // === BRASIL - Foz do Iguacu ===
  { name: 'Belmond Hotel das Cataratas', destination: 'Foz do Iguacu, Brasil', stars: 5 },
  { name: 'Wish Foz do Iguacu', destination: 'Foz do Iguacu, Brasil', stars: 4 },
  // === BRASIL - Natal ===
  { name: 'Serhs Natal Grand Hotel', destination: 'Natal, Brasil', stars: 5 },
  { name: 'Wish Natal', destination: 'Natal, Brasil', stars: 4 },
  // === BRASIL - Gramado ===
  { name: 'Hotel Casa da Montanha', destination: 'Gramado, Brasil', stars: 5 },
  { name: 'Buona Vitta Spa & Resort', destination: 'Gramado, Brasil', stars: 4 },
  { name: 'Hotel Laghetto Stilo Centro', destination: 'Gramado, Brasil', stars: 4 },
  // === BRASIL - Buzios ===
  { name: 'Casas Brancas Boutique Hotel', destination: 'Buzios, Brasil', stars: 5 },
  { name: 'Insólito Boutique Hotel', destination: 'Buzios, Brasil', stars: 5 },
  // === ESTADOS UNIDOS ===
  { name: 'The Plaza Hotel', destination: 'New York, EUA', stars: 5 },
  { name: 'The Ritz-Carlton New York', destination: 'New York, EUA', stars: 5 },
  { name: 'Hilton Midtown Manhattan', destination: 'New York, EUA', stars: 4 },
  { name: 'Marriott Marquis Times Square', destination: 'New York, EUA', stars: 4 },
  { name: 'The Standard High Line', destination: 'New York, EUA', stars: 4 },
  { name: 'Fontainebleau Miami Beach', destination: 'Miami, EUA', stars: 5 },
  { name: 'The Setai Miami Beach', destination: 'Miami, EUA', stars: 5 },
  { name: 'Hilton Miami Downtown', destination: 'Miami, EUA', stars: 4 },
  { name: 'Disney Grand Floridian Resort', destination: 'Orlando, EUA', stars: 5 },
  { name: 'Universal Aventura Hotel', destination: 'Orlando, EUA', stars: 4 },
  { name: 'Hilton Orlando Bonnet Creek', destination: 'Orlando, EUA', stars: 4 },
  { name: 'The Beverly Hills Hotel', destination: 'Los Angeles, EUA', stars: 5 },
  { name: 'The Venetian Resort', destination: 'Las Vegas, EUA', stars: 5 },
  { name: 'Bellagio Hotel', destination: 'Las Vegas, EUA', stars: 5 },
  { name: 'Four Seasons Resort Maui', destination: 'Maui, EUA', stars: 5 },
  // === EUROPA - Espanha ===
  { name: 'Hotel Arts Barcelona', destination: 'Barcelona, Espanha', stars: 5 },
  { name: 'W Barcelona', destination: 'Barcelona, Espanha', stars: 5 },
  { name: 'Mandarin Oriental Barcelona', destination: 'Barcelona, Espanha', stars: 5 },
  { name: 'Hotel Casa Fuster', destination: 'Barcelona, Espanha', stars: 5 },
  { name: 'The Westin Palace Madrid', destination: 'Madrid, Espanha', stars: 5 },
  { name: 'Hotel Ritz Madrid', destination: 'Madrid, Espanha', stars: 5 },
  // === EUROPA - Franca ===
  { name: 'Le Meurice', destination: 'Paris, Franca', stars: 5 },
  { name: 'Hotel Plaza Athenee', destination: 'Paris, Franca', stars: 5 },
  { name: 'Shangri-La Hotel Paris', destination: 'Paris, Franca', stars: 5 },
  { name: 'Ibis Paris Montmartre', destination: 'Paris, Franca', stars: 3 },
  { name: 'Novotel Paris Centre Tour Eiffel', destination: 'Paris, Franca', stars: 4 },
  // === EUROPA - Italia ===
  { name: 'Hotel Hassler Roma', destination: 'Roma, Italia', stars: 5 },
  { name: 'Baglioni Hotel Regina', destination: 'Roma, Italia', stars: 5 },
  { name: 'Hotel Danieli Venice', destination: 'Veneza, Italia', stars: 5 },
  { name: 'Four Seasons Hotel Firenze', destination: 'Florenca, Italia', stars: 5 },
  // === EUROPA - Reino Unido ===
  { name: 'The Ritz London', destination: 'Londres, Reino Unido', stars: 5 },
  { name: 'The Savoy', destination: 'Londres, Reino Unido', stars: 5 },
  { name: 'Claridge\'s', destination: 'Londres, Reino Unido', stars: 5 },
  { name: 'Premier Inn London', destination: 'Londres, Reino Unido', stars: 3 },
  // === EUROPA - Portugal ===
  { name: 'Belmond Reid\'s Palace', destination: 'Funchal, Portugal', stars: 5 },
  { name: 'Four Seasons Hotel Ritz Lisbon', destination: 'Lisboa, Portugal', stars: 5 },
  { name: 'Pestana Palace Lisboa', destination: 'Lisboa, Portugal', stars: 5 },
  { name: 'The Yeatman', destination: 'Porto, Portugal', stars: 5 },
  { name: 'InterContinental Porto', destination: 'Porto, Portugal', stars: 5 },
  // === EUROPA - Grecia ===
  { name: 'Canaves Oia Suites', destination: 'Santorini, Grecia', stars: 5 },
  { name: 'Grace Hotel Santorini', destination: 'Santorini, Grecia', stars: 5 },
  { name: 'Hotel Grande Bretagne', destination: 'Atenas, Grecia', stars: 5 },
  // === ASIA ===
  { name: 'The Peninsula Tokyo', destination: 'Toquio, Japao', stars: 5 },
  { name: 'Aman Tokyo', destination: 'Toquio, Japao', stars: 5 },
  { name: 'Park Hyatt Tokyo', destination: 'Toquio, Japao', stars: 5 },
  { name: 'Marina Bay Sands', destination: 'Singapura', stars: 5 },
  { name: 'Raffles Hotel Singapore', destination: 'Singapura', stars: 5 },
  { name: 'The Peninsula Bangkok', destination: 'Bangkok, Tailandia', stars: 5 },
  { name: 'Mandarin Oriental Bangkok', destination: 'Bangkok, Tailandia', stars: 5 },
  { name: 'Taj Mahal Palace', destination: 'Mumbai, India', stars: 5 },
  // === ORIENTE MEDIO ===
  { name: 'Burj Al Arab', destination: 'Dubai, Emirados Arabes', stars: 5 },
  { name: 'Atlantis The Palm', destination: 'Dubai, Emirados Arabes', stars: 5 },
  { name: 'Armani Hotel Dubai', destination: 'Dubai, Emirados Arabes', stars: 5 },
  // === AMERICA LATINA ===
  { name: 'Four Seasons Hotel Buenos Aires', destination: 'Buenos Aires, Argentina', stars: 5 },
  { name: 'Alvear Palace Hotel', destination: 'Buenos Aires, Argentina', stars: 5 },
  { name: 'Hotel Noi Santiago', destination: 'Santiago, Chile', stars: 5 },
  { name: 'The Ritz-Carlton Santiago', destination: 'Santiago, Chile', stars: 5 },
  { name: 'Hyatt Regency Cancun', destination: 'Cancun, Mexico', stars: 5 },
  { name: 'Secrets The Vine Cancun', destination: 'Cancun, Mexico', stars: 5 },
  { name: 'Hotel Nayara Springs', destination: 'Arenal, Costa Rica', stars: 5 },
  // === CARIBE ===
  { name: 'Sandals Royal Barbados', destination: 'Barbados', stars: 5 },
  { name: 'The Ritz-Carlton Grand Cayman', destination: 'Ilhas Cayman', stars: 5 },
  { name: 'Anse Chastanet Resort', destination: 'Santa Lucia', stars: 5 },
  // === AFRICA ===
  { name: 'One&Only Cape Town', destination: 'Cidade do Cabo, Africa do Sul', stars: 5 },
  { name: 'The Table Bay Hotel', destination: 'Cidade do Cabo, Africa do Sul', stars: 5 },
  // === OCEANIA ===
  { name: 'Park Hyatt Sydney', destination: 'Sydney, Australia', stars: 5 },
  { name: 'The Langham Melbourne', destination: 'Melbourne, Australia', stars: 5 },
  // === MALDIVAS ===
  { name: 'Soneva Fushi', destination: 'Maldivas', stars: 5 },
  { name: 'Conrad Maldives Rangali Island', destination: 'Maldivas', stars: 5 },
  { name: 'One&Only Reethi Rah', destination: 'Maldivas', stars: 5 },
];
