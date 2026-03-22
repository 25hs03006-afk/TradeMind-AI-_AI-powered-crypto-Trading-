// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TradeSignalLedger {
    struct SignalRecord {
        string signalId;
        string symbol;
        string direction;
        uint256 entry;
        uint256 takeProfit;
        uint256 stopLoss;
        uint256 confidence;
        uint256 createdAt;
        address submittedBy;
    }

    SignalRecord[] private records;
    mapping(bytes32 => bool) public existingRecord;

    event SignalRecorded(
        string signalId,
        string symbol,
        string direction,
        uint256 entry,
        uint256 takeProfit,
        uint256 stopLoss,
        uint256 confidence,
        uint256 createdAt,
        address indexed submittedBy
    );

    function recordSignal(
        string memory signalId,
        string memory symbol,
        string memory direction,
        uint256 entry,
        uint256 takeProfit,
        uint256 stopLoss,
        uint256 confidence,
        uint256 createdAt
    ) external {
        bytes32 key = keccak256(abi.encodePacked(signalId));
        require(!existingRecord[key], "Signal already stored");

        existingRecord[key] = true;
        records.push(
            SignalRecord({
                signalId: signalId,
                symbol: symbol,
                direction: direction,
                entry: entry,
                takeProfit: takeProfit,
                stopLoss: stopLoss,
                confidence: confidence,
                createdAt: createdAt,
                submittedBy: msg.sender
            })
        );

        emit SignalRecorded(
            signalId,
            symbol,
            direction,
            entry,
            takeProfit,
            stopLoss,
            confidence,
            createdAt,
            msg.sender
        );
    }

    function totalSignals() external view returns (uint256) {
        return records.length;
    }

    function getSignal(uint256 index) external view returns (SignalRecord memory) {
        require(index < records.length, "Index out of bounds");
        return records[index];
    }
}
