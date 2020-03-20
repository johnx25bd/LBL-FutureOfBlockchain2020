pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

contract ZoneRegistry {
    address admin;
    address[] registeredAddrs;
    struct DID {
        bool exist;
        bytes32 hash;
        string uri;
    }
    mapping(address => DID) DIDs;
    event Appended(address firstRegisterer);
    event Register(address caller, bytes32 hash, string uri);
    event UpdateHash(address caller, bytes32 hash);
    event UpdateURI(address caller, string uri);
    event DeleteDID(address caller);
    
    constructor() public {
        admin = msg.sender;
    }
    
    function register(bytes32 _hash, string memory _uri) public {
        if (DIDs[msg.sender].exist) {
            // require(DIDs[msg.sender].exist, “DID does not exist”);
            updateHash(_hash);
            updateURI(_uri);
        } else {
            createDID(_hash, _uri);
        }
    }
    
    function deregister(address toBeDeleted) public {
        require(msg.sender == admin || toBeDeleted == msg.sender);
        deleteDID(toBeDeleted);
    }
    
    function registeredBefore(address _addr) internal view returns (bool) {
        for (uint256 i = 0; i < registeredAddrs.length; i++) {
            if (_addr == registeredAddrs[i]) return true;
        }
        return false;
    }
    
    function createDID(bytes32 _hash, string memory _uri) internal {
        DIDs[msg.sender] = DID(true, _hash, _uri);
        if (!registeredBefore(msg.sender)) {
            registeredAddrs.push(msg.sender);
            emit Appended(msg.sender);
        }
        emit Register(msg.sender, _hash, _uri);
    }
    
    function updateHash(bytes32 hash) internal {
        DIDs[msg.sender].hash = hash;
        emit UpdateHash(msg.sender, hash);
    }
    
    function updateURI(string memory uri) internal {
        DIDs[msg.sender].uri = uri;
        emit UpdateURI(msg.sender, uri);
    }
    
    function deleteDID(address _addr) internal {
        DIDs[_addr].exist = false;
        emit DeleteDID(_addr);
    }
    function getHash() public view returns (bytes32) {
        require(DIDs[msg.sender].exist);//, “DID does not exist”);
        return DIDs[msg.sender].hash;
    }
    function getURI(address _addr) public view returns (string memory) {
        require(DIDs[_addr].exist);//, “DID does not exist”);
        return DIDs[_addr].uri;
    }
    //costs gas as it changes the state but cannot be done as member-push-isNOTavailable
    address[] existingAddrs;
    function getAddrs() public returns (address[] memory) {
        for (uint256 i = 0; i < registeredAddrs.length; i++) {
            if (DIDs[registeredAddrs[i]].exist) {
                existingAddrs.push(registeredAddrs[i]);
            }
        }
        return existingAddrs;
    }

    function getAllRegisteredURIs() {
        loop through addresses
        string[] URIs;

        URIs.push(getURI(address))

        return URIs;

    }

    DID[] existingDID;
    function getExistingDIDs() public returns (DID[] memory) {
        for (uint256 i = 0; i < registeredAddrs.length; i++) {
            if (DIDs[registeredAddrs[i]].exist) {
                existingDID.push(DIDs[registeredAddrs[i]]);
            }
        }
        return existingDID;
    }
}