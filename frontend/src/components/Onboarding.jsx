import React, { useState } from 'react';
import { Send, Download, ScanLine, PlusCircle, ShoppingCart, Check, AlertCircle, Key, Copy } from 'lucide-react';
import algosdk from 'algosdk';

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0); // 0: splash, 1: choose, 2: name, 3: terms, 4: password, 5: phrase, 6: verify, 7: success, 8: import
  const [generatedAccount, setGeneratedAccount] = useState(null);
  const [mnemonic, setMnemonic] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [verifyWords, setVerifyWords] = useState([]);
  const [selectedVerifyWords, setSelectedVerifyWords] = useState({});
  const [verifyOptions, setVerifyOptions] = useState({});
  const [importMnemonic, setImportMnemonic] = useState('');

  const generateWallet = () => {
    const account = algosdk.generateAccount();
    const mn = algosdk.secretKeyToMnemonic(account.sk);
    
    console.log('Generated account:', account); // Debug
    console.log('Address:', account.addr); // Debug
    setGeneratedAccount(account);
    setMnemonic(mn);
    
    // Generate verification quiz (ask for 3 random words)
    const words = mn.split(' ');
    const indices = [];
    while (indices.length < 3) {
      const rand = Math.floor(Math.random() * 25);
      if (!indices.includes(rand)) indices.push(rand);
    }
    const verifyList = indices.sort((a, b) => a - b).map(i => ({ index: i, word: words[i] }));
    setVerifyWords(verifyList);
    
    // Pre-generate shuffled options for each verify word
    const options = {};
    verifyList.forEach(({ index, word }) => {
      const wrongWords = words.filter(w => w !== word).sort(() => 0.5 - Math.random()).slice(0, 2);
      options[index] = [word, ...wrongWords].sort(() => 0.5 - Math.random());
    });
    setVerifyOptions(options);
    
    setStep(5); // Updated from 4 to 5
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  const verifyPhrase = () => {
    const allCorrect = verifyWords.every(({ index, word }) => 
      selectedVerifyWords[index] === word
    );
    
    if (allCorrect) {
      setStep(7); // Updated from 6 to 7
    } else {
      alert('❌ Incorrect words selected. Please try again.');
      setSelectedVerifyWords({}); // Reset selections
    }
  };

  const handleImport = () => {
    try {
      const trimmed = importMnemonic.trim();
      const account = algosdk.mnemonicToSecretKey(trimmed);
      
      console.log('Imported account:', account); // Debug
      setGeneratedAccount(account);
      setMnemonic(trimmed);
      setPassword('imported'); // Set a default password for imported wallets
      setStep(7); // Updated from 6 to 7 - Skip phrase display/verify for imports
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Invalid recovery phrase. Please check and try again.');
    }
  };

  const saveWallet = () => {
    // Store mnemonic securely in localStorage
    // WARNING: In production, use better encryption
    console.log('Saving wallet, generatedAccount:', generatedAccount); // Debug
    console.log('Address type:', typeof generatedAccount?.addr); // Debug
    
    if (generatedAccount && generatedAccount.addr) {
      const address = String(generatedAccount.addr);
      localStorage.setItem('algoPayMnemonic', mnemonic);
      localStorage.setItem('algoPayAddress', address);
      localStorage.setItem('algoPayPassword', password); // In production: hash this!
      localStorage.setItem('algoPayUsername', username || 'User'); // Save username
      localStorage.setItem('algoPayOnboarded', 'true');
      onComplete();
    } else {
      console.error('Invalid generatedAccount:', generatedAccount);
      alert('❌ Error: Wallet address not generated properly. Please try again.');
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{
      background: 'radial-gradient(ellipse at top, #0f1729 0%, #000000 50%, #000000 100%)'
    }}>
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-900/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto">
        {/* Progress Indicator */}
        {step > 0 && step < 7 && step !== 8 && (
          <div className="absolute top-8 left-6 right-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-300/60">Step {step} of 6</span>
              <span className="text-xs text-blue-300/60">{Math.round((step / 6) * 100)}%</span>
            </div>
            <div className="w-full h-1 bg-blue-900/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 0: Splash Screen */}
        {step === 0 && (
          <div className="text-center fade-in">
            <div className="mb-12">
              <div className="w-32 h-32 mx-auto rounded-full mb-6 floating" style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                boxShadow: '0 20px 60px rgba(59, 130, 246, 0.5)'
              }}>
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-7xl">Ⱥ</span>
                </div>
              </div>
              <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-200 to-blue-400 bg-clip-text text-transparent">AlgoPay</h1>
              <p className="text-xl text-blue-200/70">A trusted & secure crypto wallet</p>
            </div>

            <button 
              onClick={() => setStep(1)}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)'}
            >
              Get Started
            </button>
          </div>
        )}

        {/* Step 1: Choose Create or Import */}
        {step === 1 && (
          <div className="w-full fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Let's get started</h2>
              <p className="text-blue-200/70">Create a new wallet or import an existing one</p>
            </div>

            <div className="space-y-4 mb-8">
              <button 
                onClick={() => setStep(2)}
                className="w-full p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 text-left glass glass-hover"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <PlusCircle size={28} className="text-blue-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">Create a new wallet</h3>
                    <p className="text-sm text-blue-200/60">Set up a new Algorand wallet</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setStep(8)}
                className="w-full p-6 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 text-left glass glass-hover"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Download size={28} className="text-blue-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-1">Import existing wallet</h3>
                    <p className="text-sm text-blue-200/60">Use your recovery phrase</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Username */}
        {step === 2 && (
          <div className="w-full fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <h2 className="text-3xl font-bold mb-3">What should we call you?</h2>
              <p className="text-blue-200/70">Choose a display name for your wallet</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-6">
              <div>
                <label className="block text-sm text-blue-200/70 mb-2 font-medium">Display Name</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full px-4 py-3 rounded-lg bg-black/30 border border-blue-500/20 text-white placeholder-blue-200/40 focus:border-blue-500/50 focus:outline-none transition-colors"
                />
                <div className="mt-2 text-xs text-blue-200/50">
                  This will be displayed in your wallet
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setStep(3)}
                disabled={!username.trim()}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: username.trim() ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#374151',
                  boxShadow: username.trim() ? '0 8px 24px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => username.trim() && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)')}
                onMouseLeave={(e) => username.trim() && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)')}
              >
                Continue
              </button>
              
              <button 
                onClick={() => setStep(1)}
                className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all glass glass-hover"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Terms of Service */}
        {step === 3 && (
          <div className="w-full fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Terms of Service</h2>
              <p className="text-blue-200/70">Please review and accept our terms</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-6 max-h-96 overflow-y-auto">
              <div className="space-y-4 text-sm text-blue-200/80">
                <p className="font-semibold text-white">AlgoPay Wallet Terms</p>
                <p>By using AlgoPay, you agree to:</p>
                <ul className="list-disc list-inside space-y-2 text-blue-200/70">
                  <li>Take full responsibility for your wallet security</li>
                  <li>Safely store your recovery phrase offline</li>
                  <li>Understand that lost phrases cannot be recovered</li>
                  <li>Use this wallet on Algorand TestNet</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
                <p className="text-blue-200/60 text-xs mt-4">
                  AlgoPay is a non-custodial wallet. You control your private keys. We never have access to your funds or recovery phrase.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-2 border-blue-400/50 bg-transparent checked:bg-blue-500 transition-all"
                />
                <span className="text-sm text-blue-200/80 group-hover:text-white transition-colors">
                  I have read and agree to the Terms of Service
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setStep(4)}
                disabled={!acceptedTerms}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: acceptedTerms ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#374151',
                  boxShadow: acceptedTerms ? '0 8px 24px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => acceptedTerms && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)')}
                onMouseLeave={(e) => acceptedTerms && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)')}
              >
                Continue
              </button>
              
              <button 
                onClick={() => setStep(2)}
                className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all glass glass-hover"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Create Password */}
        {step === 4 && (
          <div className="w-full fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Create Password</h2>
              <p className="text-blue-200/70">This password unlocks your wallet on this device</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-blue-200/70 mb-2 font-medium">Password</label>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-blue-500/20 text-white placeholder-blue-200/40 focus:border-blue-500/50 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-blue-200/70 mb-2 font-medium">Confirm Password</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 rounded-lg bg-black/30 border border-blue-500/20 text-white placeholder-blue-200/40 focus:border-blue-500/50 focus:outline-none transition-colors"
                  />
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <div className="text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle size={14} />
                    Passwords do not match
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-blue-200/50">
                Password must be at least 8 characters
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={generateWallet}
                disabled={!password || password.length < 8 || password !== confirmPassword}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: (password && password.length >= 8 && password === confirmPassword) ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#374151',
                  boxShadow: (password && password.length >= 8 && password === confirmPassword) ? '0 8px 24px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => (password && password.length >= 8 && password === confirmPassword) && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)')}
                onMouseLeave={(e) => (password && password.length >= 8 && password === confirmPassword) && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)')}
              >
                Continue
              </button>
              
              <button 
                onClick={() => setStep(3)}
                className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all glass glass-hover"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Display Recovery Phrase */}
        {step === 5 && (
          <div className="w-full fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                <Key size={32} className="text-yellow-400" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Secret Recovery Phrase</h2>
              <p className="text-blue-200/70">Write down these 25 words in order and store them safely</p>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-200">
                  <strong className="text-white">Never share this phrase!</strong> Anyone with this phrase can access your funds. AlgoPay will never ask for your phrase.
                </div>
              </div>
            </div>

            {/* Mnemonic Display */}
            <div className="glass rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-blue-200/70 font-semibold">Your 25 Words</div>
                <button 
                  onClick={copyMnemonic}
                  className="text-xs px-3 py-1.5 rounded-lg glass glass-hover transition-all flex items-center gap-1.5"
                >
                  {mnemonicCopied ? (
                    <>
                      <Check size={14} className="text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy All
                    </>
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 bg-black/30 rounded-lg p-4 max-h-80 overflow-y-auto">
                {mnemonic.split(' ').map((word, index) => (
                  <div key={index} className="flex items-center gap-2 bg-blue-500/5 rounded px-2 py-1.5 border border-blue-500/10">
                    <span className="text-[10px] text-blue-400/60 font-mono w-5">{index + 1}</span>
                    <span className="text-sm text-white font-medium">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setStep(6)}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)'}
              >
                I Saved My Phrase
              </button>
              
              <button 
                onClick={() => setStep(4)}
                className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all glass glass-hover"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Verify Recovery Phrase */}
        {step === 6 && (
          <div className="w-full fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Verify Your Phrase</h2>
              <p className="text-blue-200/70">Select the correct words to continue</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-6">
              <div className="space-y-6">
                {verifyWords.map(({ index, word }) => (
                  <div key={index}>
                    <label className="block text-sm text-blue-200/70 mb-3 font-medium">
                      Word #{index + 1}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Use pre-generated options */}
                      {verifyOptions[index]?.map((option) => (
                        <button
                          key={option}
                          onClick={() => setSelectedVerifyWords({...selectedVerifyWords, [index]: option})}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            selectedVerifyWords[index] === option
                              ? 'bg-blue-500 text-white border-2 border-blue-400'
                              : 'bg-black/30 text-blue-100 border border-blue-500/20 hover:border-blue-500/40'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={verifyPhrase}
                disabled={Object.keys(selectedVerifyWords).length !== verifyWords.length}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: Object.keys(selectedVerifyWords).length === verifyWords.length ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#374151',
                  boxShadow: Object.keys(selectedVerifyWords).length === verifyWords.length ? '0 8px 24px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => Object.keys(selectedVerifyWords).length === verifyWords.length && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)')}
                onMouseLeave={(e) => Object.keys(selectedVerifyWords).length === verifyWords.length && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)')}
              >
                Verify
              </button>
              
              <button 
                onClick={() => setStep(5)}
                className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all glass glass-hover"
              >
                Back to Phrase
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Success */}
        {step === 7 && (
          <div className="w-full fade-in text-center">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6" style={{
                animation: 'successPulse 2s ease-in-out infinite'
              }}>
                <Check size={48} className="text-green-400" />
              </div>
              <h2 className="text-4xl font-bold mb-3">You're all set!</h2>
              <p className="text-blue-200/70 text-lg">Your wallet has been created successfully</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-8 text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-200/70">Wallet Address</span>
                  <span className="text-xs text-blue-300 font-mono">
                    {generatedAccount && generatedAccount.addr && typeof generatedAccount.addr === 'string' ? 
                      `${generatedAccount.addr.slice(0, 6)}...${generatedAccount.addr.slice(-6)}` : 
                      'Generating...'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-200/70">Network</span>
                  <span className="text-xs text-blue-300 font-semibold">Algorand TestNet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-200/70">Status</span>
                  <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    Active
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={saveWallet}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)'}
            >
              Open My Wallet
            </button>

            <style>{`
              @keyframes successPulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.05); opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {/* Step 8: Import Wallet */}
        {step === 8 && (
          <div className="w-full fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-3">Import Wallet</h2>
              <p className="text-blue-200/70">Enter your 25-word recovery phrase</p>
            </div>

            <div className="glass rounded-2xl p-6 mb-6">
              <label className="block text-sm text-blue-200/70 mb-3 font-medium">Recovery Phrase</label>
              <textarea 
                value={importMnemonic}
                onChange={(e) => setImportMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ... word25"
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-black/30 border border-blue-500/20 text-white placeholder-blue-200/40 focus:border-blue-500/50 focus:outline-none transition-colors resize-none font-mono text-sm"
              />
              <div className="mt-2 text-xs text-blue-200/50">
                Separate each word with a space
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleImport}
                disabled={importMnemonic.trim().split(' ').length !== 25}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: importMnemonic.trim().split(' ').length === 25 ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#374151',
                  boxShadow: importMnemonic.trim().split(' ').length === 25 ? '0 8px 24px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => importMnemonic.trim().split(' ').length === 25 && (e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.6)')}
                onMouseLeave={(e) => importMnemonic.trim().split(' ').length === 25 && (e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)')}
              >
                Import Wallet
              </button>
              
              <button 
                onClick={() => setStep(1)}
                className="w-full py-3 px-6 rounded-xl font-medium text-sm transition-all glass glass-hover"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Onboarding;

