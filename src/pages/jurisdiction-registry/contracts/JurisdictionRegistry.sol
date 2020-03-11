pragma solidity ^0.6.1;
pragma experimental ABIEncoderV2;

contract JurisdictionRegistry {

  address admin;
  mapping(address=>bool) registeredAddresses;
  address[] public addresses;

  constructor () public {
    admin = msg.sender;
  }

  function registerAddress () public {
      require(registeredAddresses[msg.sender] != true, "This address is already registered");
      addresses.push(msg.sender);
      registeredAddresses[msg.sender] = true;
  }

//   function deregisterAddress (address addressToDeregister) public {

//       if (addressToDeregister != address(0x0)) {
//           // Admin can deregister addresses
//           require(msg.sender == admin);
//           registeredAddresses[addressToDeregister] = false;
//       } else {
//           // Addresses can deregister themselves
//           require(registeredAddresses[msg.sender] == true, "This address is not registered");
//           registeredAddresses[msg.sender] = false;
//           // this still leaves the address in the addresses array, meaning if they re-register it is added twice.
//       }
//   }

  function getRegisteredAddresses() public view returns (address[] memory) {
        return addresses;
    //   address[] memory addressesToReturn; // = new address[](addresses.length);

    //   for (uint i = 0; i < addresses.length; i++) {
    //       if (registeredAddresses[addresses[i]]) {
    //           addressesToReturn[i] = addresses[i];
    //       }
    //   }

    //   return addressesToReturn;
  }

}
