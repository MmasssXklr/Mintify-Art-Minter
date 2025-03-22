import React, { useState, useRef } from "react";
import { BrowserProvider, Contract } from "ethers";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import "./App.css";

import Logo from "./images/5.png";
import Background from "./images/8.png"; 
import CloudIcon from "./images/7.png";  

const CONTRACT_ADDRESS = "0xAA31860aeAcdac1a9f536475b053EFc052d622DC";
const ETHERSCAN_BASE_URL = "https://sepolia.etherscan.io/tx/";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [mintedNFT, setMintedNFT] = useState(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [tokenURI, setTokenURI] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask is not installed! Please install it to continue.");
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      console.log("Connected Wallet Address:", address);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      alert("Failed to connect MetaMask!");
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  function handleFileChange(event) {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  }

  function handleBrowse() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleUploadAndMint() {
    if (!walletAddress) {
      alert("Please connect your MetaMask wallet first!");
      return;
    }
    if (!selectedFile) {
      alert("Please select a file to upload!");
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadResponse = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const metadataCID = uploadResponse.data.cid;
      console.log(`File uploaded! CID: ${metadataCID}`);
      setTokenURI(metadataCID.replace("ipfs://", ""));

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(
        CONTRACT_ADDRESS,
        ["function mintNFT(address recipient, string memory tokenURI) public returns (uint256)"],
        signer
      );

      const tx = await contract.mintNFT(walletAddress, `ipfs://${metadataCID}`);
      await tx.wait();

      setMintedNFT({
        transactionHash: tx.hash,
        imageUrl: `https://gateway.pinata.cloud/ipfs/${metadataCID}`,
      });

      console.log("NFT Minted! Transaction Hash:", tx.hash);
    } catch (error) {
      console.error("Process failed:", error);
      alert("Upload or minting failed! Check console for details.");
    } finally {
      setProcessing(false);
    }
  }

  function searchTransaction() {
    if (transactionHash.trim() === "") {
      alert("Please enter a transaction hash!");
      return;
    }
    window.open(`${ETHERSCAN_BASE_URL}${transactionHash}`, "_blank");
  }

  function copyTransactionHash() {
    if (mintedNFT) {
      navigator.clipboard.writeText(mintedNFT.transactionHash);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  }

  return (
    <div className="container mt-5">
      <div className="text-center">
        <img src={Logo} alt="Mintify" style={{ maxWidth: "400px", height: "auto" }} />
        <p
          style={{
            color: "blue",
            fontSize: "1.1rem",
            marginTop: "0px",
            lineHeight: "1.5",
          }}
        >
          A decentralized platform that effortlessly mint and verify digital artwork as <br/>
          immutable ERC-721 NFTs on the Ethereum Sepolia testnet.
          <br />
        </p>
      </div>

      <div className="text-center mt-3">
        <button className="btn btn-primary mb-3" onClick={connectWallet}>
          {walletAddress
            ? `Connected: ${walletAddress.slice(0, 4)}...${walletAddress.slice(-2)}`
            : "Connect MetaMask"}
        </button>


        {walletAddress && !mintedNFT && (
          <div className="mt-3">
            <div
              style={{
                maxWidth: "400px",
                margin: "0 auto",
                backgroundImage: `url(${Background})`,
                backgroundPosition: "center",
                border: "1px dashed #ccc",
                borderRadius: "10px",
                padding: "15px",
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleBrowse}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <img
                  src={CloudIcon}
                  alt="Upload Icon"
                  style={{ width: "90px", height: "90px", marginBottom: "10px" }}
                />
                <p className="drag-drop-text mb-0">
                  Drag &amp; Drop to Upload File
                  <br /> OR
                  <br />
                  <button
                    type="button"
                    className="browse-btn"
                    onClick={handleBrowse}
                  >
                    Browse
                  </button>
                </p>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {selectedFile && (
              <div className="mt-2">
                <p>
                  <strong>Selected File:</strong> {selectedFile.name}
                </p>
              </div>
            )}

            <button
              className="btn btn-success mt-3"
              onClick={handleUploadAndMint}
              disabled={processing}
            >
              {processing ? "Processing..." : "Upload & Mint NFT"}
            </button>
          </div>
        )}

        {mintedNFT && (
          <div className="mt-4 text-center">
            <h4>NFT Minted Successfully!</h4>

            <p>
              <strong>Transaction Hash:</strong>
              <input
                type="text"
                className="form-control mt-2"
                value={mintedNFT.transactionHash}
                readOnly
              />
              <div className="mt-2">
                <button
                  className={`btn ${copied ? "btn-success" : "btn-primary"}`}
                  onClick={copyTransactionHash}
                  style={{ marginRight: "10px" }}
                >
                  {copied ? "Copied Transaction Hash" : "Copy Transaction Hash"}
                </button>
                <a
                  href={`${ETHERSCAN_BASE_URL}${mintedNFT.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ color: "#fff" }}
                >
                  View on Etherscan
                </a>
              </div>
            </p>

            <p>
              <strong>Token URI:</strong> {tokenURI}
            </p>

            <img
              src={mintedNFT.imageUrl}
              alt="Minted NFT"
              className="img-fluid rounded"
              style={{ maxWidth: "300px", marginTop: "10px" }}
            />

            <div className="mt-3">
              <button
                className="btn btn-success"
                onClick={() => window.location.reload()}
              >
                Mint Again?
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 text-center">
          <h5>Search Transaction on Etherscan</h5>
          <input
            type="text"
            className="form-control mt-2"
            placeholder="Enter Transaction Hash"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
          />
          <button className="btn btn-success mt-2" onClick={searchTransaction}>
            Search
          </button>
          <br/>
          <br/>
          <br/>
          <br/>
        </div>
      </div>
    </div>
  );
  
}

export default App;
