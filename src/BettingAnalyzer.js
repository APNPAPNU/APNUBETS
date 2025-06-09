import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Shield, DollarSign, Target, AlertTriangle, Plus, Minus } from 'lucide-react';

const BettingAnalyzer = () => {
  const [bankroll, setBankroll] = useState(1000);
  const [bets, setBets] = useState([]);
  const [markets, setMarkets] = useState([
    { id: 1, name: "+122/-138", odds: 128.72, book: "Pinnacle", weight: 30 },
    { id: 2, name: "+125/-145", odds: 133.16, book: "Circa", weight: 25 },
    { id: 3, name: "+120/-140", odds: 128.33, book: "BetOnline", weight: 15 },
    { id: 4, name: "+136/-168", odds: 147.94, book: "FanDuel", weight: 90 },
    { id: 5, name: "+120/-150", odds: 132, book: "Caesars", weight: 5 },
  ]);
  
  const [newBet, setNewBet] = useState({
    market: '',
    odds: 0,
    probability: 0.5,
    book: '',
    weight: 0
  });

  const [settings, setSettings] = useState({
    minEdge: 0.02,
    maxKellyFraction: 0.25,
    unitSize: 0.02
  });

  // Kelly Criterion calculation
  const calculateKelly = (probability, decimalOdds) => {
    const b = decimalOdds - 1;
    const p = probability;
    const q = 1 - p;
    
    if (p * b - q <= 0) return 0;
    
    const kelly = (p * b - q) / b;
    return Math.min(kelly, settings.maxKellyFraction);
  };

  // Convert American odds to decimal
  const americanToDecimal = (american) => {
    if (american > 0) {
      return (american / 100) + 1;
    } else {
      return (100 / Math.abs(american)) + 1;
    }
  };

  // Calculate weighted average odds
  const calculateWeightedAvg = () => {
    const totalWeight = markets.reduce((sum, market) => sum + market.weight, 0);
    const weightedSum = markets.reduce((sum, market) => sum + (market.odds * market.weight), 0);
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  // Calculate fair odds and edge
  const calculateEdge = (marketOdds) => {
    const weightedAvg = calculateWeightedAvg();
    const fairOdds = weightedAvg;
    const edge = (fairOdds - marketOdds) / marketOdds;
    return edge;
  };

  // Find +EV opportunities
  const findPlusEVBets = () => {
    return markets.filter(market => {
      const edge = calculateEdge(market.odds);
      return edge > settings.minEdge;
    }).map(market => {
      const edge = calculateEdge(market.odds);
      const decimalOdds = americanToDecimal(market.odds);
      const impliedProb = 1 / decimalOdds;
      const fairProb = impliedProb + edge;
      const kelly = calculateKelly(fairProb, decimalOdds);
      const betAmount = bankroll * kelly;
      
      return {
        ...market,
        edge,
        decimalOdds,
        impliedProb,
        fairProb,
        kelly,
        betAmount,
        potentialProfit: betAmount * (decimalOdds - 1)
      };
    });
  };

  // Find arbitrage opportunities
  const findArbitrageOpps = () => {
    const sortedMarkets = [...markets].sort((a, b) => b.odds - a.odds);
    const arbs = [];
    
    for (let i = 0; i < sortedMarkets.length - 1; i++) {
      const market1 = sortedMarkets[i];
      const market2 = sortedMarkets[i + 1];
      
      const odds1 = americanToDecimal(market1.odds);
      const odds2 = americanToDecimal(market2.odds);
      
      const totalImplied = (1/odds1) + (1/odds2);
      
      if (totalImplied < 1) {
        const profitMargin = (1 - totalImplied) * 100;
        const stake1 = 100 / (odds1 * totalImplied);
        const stake2 = 100 / (odds2 * totalImplied);
        
        arbs.push({
          market1: market1.name,
          book1: market1.book,
          odds1: market1.odds,
          stake1,
          market2: market2.name,
          book2: market2.book,
          odds2: market2.odds,
          stake2,
          profitMargin
        });
      }
    }
    
    return arbs;
  };

  const addBet = () => {
    if (!newBet.market || !newBet.odds || !newBet.book) return;
    
    const id = Date.now();
    const bet = {
      id,
      ...newBet,
      timestamp: new Date().toLocaleString(),
      status: 'pending'
    };
    
    setBets([...bets, bet]);
    setNewBet({ market: '', odds: 0, probability: 0.5, book: '', weight: 0 });
  };

  const addMarket = () => {
    if (!newBet.market || !newBet.odds || !newBet.book) return;
    
    const id = Date.now();
    const market = {
      id,
      name: newBet.market,
      odds: newBet.odds,
      book: newBet.book,
      weight: newBet.weight || 10
    };
    
    setMarkets([...markets, market]);
    setNewBet({ market: '', odds: 0, probability: 0.5, book: '', weight: 0 });
  };

  const removeMarket = (id) => {
    setMarkets(markets.filter(m => m.id !== id));
  };

  const plusEVBets = findPlusEVBets();
  const arbitrageOpps = findArbitrageOpps();
  const weightedAvg = calculateWeightedAvg();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <TrendingUp className="text-green-400" />
            Apnubets Analysis System
          </h1>
          <p className="text-blue-200">Find +EV bets, arbitrage opportunities, and manage bankroll</p>
        </div>

        {/* Bankroll & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="text-green-400" />
              <h3 className="text-white font-semibold">Bankroll</h3>
            </div>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-full bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
              placeholder="Enter bankroll"
            />
            <div className="text-blue-200 text-sm mt-2">
              Unit Size: ${(bankroll * settings.unitSize).toFixed(2)}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Target className="text-orange-400" />
              <h3 className="text-white font-semibold">Edge Settings</h3>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-blue-200 text-sm">Min Edge (%)</label>
                <input
                  type="number"
                  value={settings.minEdge * 100}
                  onChange={(e) => setSettings({...settings, minEdge: e.target.value / 100})}
                  className="w-full bg-white/20 text-white rounded px-2 py-1 text-sm"
                  step="0.1"
                />
              </div>
              <div>
                <label className="text-blue-200 text-sm">Max Kelly (%)</label>
                <input
                  type="number"
                  value={settings.maxKellyFraction * 100}
                  onChange={(e) => setSettings({...settings, maxKellyFraction: e.target.value / 100})}
                  className="w-full bg-white/20 text-white rounded px-2 py-1 text-sm"
                  step="1"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="text-purple-400" />
              <h3 className="text-white font-semibold">Weighted Average</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              {weightedAvg.toFixed(2)}
            </div>
            <div className="text-blue-200 text-sm">
              Fair Odds Estimate
            </div>
          </div>
        </div>

        {/* Add Market */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
          <h3 className="text-white font-semibold mb-4">Add Market</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Market (e.g., +120/-140)"
              value={newBet.market}
              onChange={(e) => setNewBet({...newBet, market: e.target.value})}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
            />
            <input
              type="number"
              placeholder="Odds"
              value={newBet.odds || ''}
              onChange={(e) => setNewBet({...newBet, odds: Number(e.target.value)})}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
            />
            <input
              type="text"
              placeholder="Sportsbook"
              value={newBet.book}
              onChange={(e) => setNewBet({...newBet, book: e.target.value})}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
            />
            <input
              type="number"
              placeholder="Weight %"
              value={newBet.weight || ''}
              onChange={(e) => setNewBet({...newBet, weight: Number(e.target.value)})}
              className="bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
            />
            <button
              onClick={addMarket}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Market
            </button>
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
          <h3 className="text-white font-semibold mb-4">Current Markets</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2">Market</th>
                  <th className="text-left py-2">Odds</th>
                  <th className="text-left py-2">Book</th>
                  <th className="text-left py-2">Weight</th>
                  <th className="text-left py-2">Edge</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {markets.map(market => {
                  const edge = calculateEdge(market.odds);
                  return (
                    <tr key={market.id} className="border-b border-white/10">
                      <td className="py-2">{market.name}</td>
                      <td className="py-2">{market.odds}</td>
                      <td className="py-2">{market.book}</td>
                      <td className="py-2">{market.weight}%</td>
                      <td className={`py-2 ${edge > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(edge * 100).toFixed(2)}%
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removeMarket(market.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Minus size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* +EV Bets */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-green-400" />
              <h3 className="text-white font-semibold">+EV Opportunities</h3>
            </div>
            
            {plusEVBets.length > 0 ? (
              <div className="space-y-4">
                {plusEVBets.map(bet => (
                  <div key={bet.id} className="bg-green-900/30 rounded-lg p-4 border border-green-500/30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-medium">{bet.name}</div>
                        <div className="text-green-200 text-sm">{bet.book}</div>
                      </div>
                      <div className="text-green-400 font-bold">
                        +{(bet.edge * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-blue-200">Kelly Size</div>
                        <div className="text-white">{(bet.kelly * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-blue-200">Bet Amount</div>
                        <div className="text-white">${bet.betAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-blue-200">Potential Profit</div>
                        <div className="text-green-400">${bet.potentialProfit.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-blue-200">Implied Prob</div>
                        <div className="text-white">{(bet.impliedProb * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-blue-200 py-8">
                <AlertTriangle className="mx-auto mb-2 opacity-50" />
                No +EV opportunities found
              </div>
            )}
          </div>

          {/* Arbitrage Opportunities */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-blue-400" />
              <h3 className="text-white font-semibold">Arbitrage Opportunities</h3>
            </div>
            
            {arbitrageOpps.length > 0 ? (
              <div className="space-y-4">
                {arbitrageOpps.map((arb, index) => (
                  <div key={index} className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
                    <div className="text-center mb-3">
                      <div className="text-blue-400 font-bold text-lg">
                        {arb.profitMargin.toFixed(2)}% Profit
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white/10 rounded p-2">
                        <div className="text-blue-200">Bet 1</div>
                        <div className="text-white font-medium">{arb.market1}</div>
                        <div className="text-blue-200">{arb.book1}</div>
                        <div className="text-green-400">${arb.stake1.toFixed(2)}</div>
                      </div>
                      <div className="bg-white/10 rounded p-2">
                        <div className="text-blue-200">Bet 2</div>
                        <div className="text-white font-medium">{arb.market2}</div>
                        <div className="text-blue-200">{arb.book2}</div>
                        <div className="text-green-400">${arb.stake2.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-blue-200 py-8">
                <AlertTriangle className="mx-auto mb-2 opacity-50" />
                No arbitrage opportunities found
              </div>
            )}
          </div>
        </div>

        {/* Kelly Calculator */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-purple-400" />
            <h3 className="text-white font-semibold">Kelly Criterion Calculator</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-blue-200 text-sm block mb-1">Win Probability</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={newBet.probability}
                onChange={(e) => setNewBet({...newBet, probability: Number(e.target.value)})}
                className="w-full bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
              />
            </div>
            <div>
              <label className="text-blue-200 text-sm block mb-1">American Odds</label>
              <input
                type="number"
                value={newBet.odds || ''}
                onChange={(e) => setNewBet({...newBet, odds: Number(e.target.value)})}
                className="w-full bg-white/20 text-white rounded-lg px-3 py-2 border border-white/30"
              />
            </div>
            <div>
              <label className="text-blue-200 text-sm block mb-1">Kelly %</label>
              <div className="bg-white/20 rounded-lg px-3 py-2 text-white">
                {newBet.odds ? (calculateKelly(newBet.probability, americanToDecimal(newBet.odds)) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
            <div>
              <label className="text-blue-200 text-sm block mb-1">Bet Amount</label>
              <div className="bg-white/20 rounded-lg px-3 py-2 text-white">
                ${newBet.odds ? (bankroll * calculateKelly(newBet.probability, americanToDecimal(newBet.odds))).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Management Tips */}
        <div className="mt-6 bg-red-900/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-400" />
            <h3 className="text-white font-semibold">Risk Management Tips</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-100">
            <div>
              <p>• Never bet more than 25% Kelly size</p>
              <p>• Diversify across multiple bookmakers</p>
              <p>• Track all bets in detailed records</p>
            </div>
            <div>
              <p>• Mix value bets with recreational bets</p>
              <p>• Withdraw profits regularly</p>
              <p>• Always bet within your bankroll limits</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BettingAnalyzer;